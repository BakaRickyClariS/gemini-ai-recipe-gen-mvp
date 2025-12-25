/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
	pgm.createTable('groups', {
	    id: 'id',
	    name: { type: 'varchar(100)', notNull: true },
	    admin_id: {
	      type: 'integer',
	      notNull: true,
	      // Creates FK: admin_id REFERENCES users(id)
	      references: '"users"',
	      onDelete: 'CASCADE', // Optional: Cascade delete
	    },
	    photo: { type: 'varchar(255)' },
	    createdAt: {
	      type: 'timestamp',
	      notNull: true,
	      default: pgm.func('current_timestamp'),
	    },
	    updatedAt: {
	      type: 'timestamp',
	      notNull: true,
	      default: pgm.func('current_timestamp'),
	    },
	  });

	pgm.createIndex('users', 'admin_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
	pgm.dropTable('groups');
};
