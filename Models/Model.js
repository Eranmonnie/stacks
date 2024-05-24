const pool = require('./connection');
const pluralize = require("pluralize");

class Model {
    constructor(params = {}) {
        Object.assign(this, params);
        return this;
    }

    static get tableName() {
        let name = this.name;

        name = name.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);

        let words = name.split('_');
        words = words.map(word => pluralize(word));
        let pluralizedName = words.join('_');

        return pluralizedName.replace(/^_/, '').toLowerCase();
    }

    static async find(filters = [], table = null, columns = []) {
        let result = [];
        let params = [];
        let val = [];
        let operators = [];
        let sql = `SELECT ${columns.length ? columns.join(', ') : '*'} FROM ${table || this.tableName}`;

        try {
            if (filters.length) {
                if (Array.isArray(filters[0])) {
                    let includesOr = filters.some(([p]) => p.toLowerCase() === 'or');
                    let includesLike = filters.some(([p]) => p.toLowerCase() === 'like');
                    let operator = (includesOr) ? "OR" : "AND";
                    let separator = (includesLike) ? "LIKE" : "=";

                    if (filters.map(item => item[0].toLowerCase()).includes("order by")) {
                        let orderByIndex = filters.findIndex(item => item[0].toLowerCase() === "order by");
                        operators.push(filters[orderByIndex]);
                        filters.splice(orderByIndex, 1);
                    }
                    if (filters.map(item => item[0].toLowerCase()).includes("limit")) {
                        let limitIndex = filters.findIndex(item => item[0].toLowerCase() === "limit");
                        operators.push(filters[limitIndex]);
                        filters.splice(limitIndex, 1);
                    }
                    if (filters.map(item => item[0].toLowerCase()).includes("offset")) {
                        let offsetIndex = filters.findIndex(item => item[0].toLowerCase() === "offset");
                        operators.push(filters[offsetIndex]);
                        filters.splice(offsetIndex, 1);
                    }

                    params = filters.filter(([p, v]) => v !== undefined && v !== null && v !== '').map(([p, v]) => p);
                    val = filters.filter(([p, v]) => v !== undefined && v !== null && v !== '').map(([p, v]) => v);

                    let operatorsString = operators.map(op => op.join(' ')).join(' ');

                    let clause = "";
                    if (params.length) clause += ` WHERE`;
                    for (let i = 0; i < params.length; i++) {
                        clause += ` ${params[i]} ${separator} ? ${operator}`;
                    }

                    clause = clause.replace(/ (AND|OR)$/, '');

                    sql += `${clause} ${operatorsString}`;
                } else {
                    params.push(filters[0]);
                    val.push(filters[1]);

                    sql += ` WHERE ${params} = ?`;
                }
            }
            let rows = await this.query(sql, val);
            for (const row of rows) {
                result.push(new this(row));
            }
            return result;
        } catch (err) {
            console.error(`\n-- SQL: ${sql}\n-- Values: ${val}\n-- Filters: ${filters}\n-- ${err}\n`)
            return [];
        }
    }

    async add() {
        const columns = Object.keys(this).join(", ");
        const values = Object.values(this);

        const sql = `INSERT INTO ${this.constructor.tableName} (${columns}) VALUES (${Array(Object.keys(this).length).fill('?').join(', ')})`;
        try {
            const result = await this.constructor.query(sql, values);

            if (result.affectedRows > 0) {
                this.id = result.insertId;
                return result.affectedRows;
            } else {
                return 0;
            }
        } catch (error) {
            console.error(`\n-- SQL: ${sql}\n-- Columns: ${columns}\n-- Values: ${values}\n-- ${error}\n`)
            console.error(error);
            return { no: error.errno, message: error.sqlMessage };
        }
    }

    async multiAdd() {
        if (!this?.columns && !this?.values) return 0;

        const columns = this.columns.join(", ");
        const values = this.values.map(row => {
            return row.map(value => {
                return typeof value === 'string' ? `'${value}'` : value;
            });
        });

        const sql = `INSERT INTO ${this.constructor.tableName} (${columns}) VALUES ${values.map(row => `(${row.join(', ')})`).join(", ")}`;

        try {
            const result = await this.constructor.query(sql);

            if (result.affectedRows > 0) {
                this.id = result.insertId;
                return result.affectedRows;
            } else {
                return 0;
            }
        } catch (error) {
            console.error(`\n-- SQL: ${sql}\n-- Columns: ${columns}\n-- Values: ${values}\n-- ${error}\n`)
            console.error(error);
            return 0;
        }
    }

    async update() {
        try {
            let sql = `UPDATE ${this.constructor.tableName} SET ${Object.keys(this).join(' = ?, ')} = ? WHERE id = ?`;
            let result = await this.constructor.query(sql, [...Object.values(this), this.id]);
            return result.affectedRows;
        } catch (error) {
            console.error(error);
            return 0;
        }
    }

    static async delete(id) {
        try {
            let sql = `DELETE FROM ${this.tableName} WHERE id = ?`;
            await this.query(sql, [id]);
        } catch (error) {
            console.error(`Error deleting record with id ${id}:`, error);
            throw error;
        }
    }

    static async customSql(sql, val = '') {
        try {
            const rows = await this.query(sql, val);
            return (Array.isArray(rows)) ? rows?.map(row => new this(row)) : rows.affectedRows;
        } catch (error) {
            console.error(`Error executing custom SQL query:`, error);
            throw error;
        }
    }

    static async query(sql, params = []) {
        let connection;
        try {
            connection = await pool.getConnection();
            const [results] = await connection.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Error executing query:', error);
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = Model;
