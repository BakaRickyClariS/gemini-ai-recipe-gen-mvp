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
	pgm.createTable('shopping_list_items', {
	    id: 'id',
	    shopping_list_id: {
	      type: 'integer',
	      notNull: true,
	      // Creates FK: admin_id REFERENCES users(id)
	      references: '"shopping_lists"',
	      onDelete: 'CASCADE', // Optional: Cascade delete
	    },
	    user_id: {
	      type: 'integer',
	      notNull: true,
	      // Creates FK: admin_id REFERENCES users(id)
	      references: '"users"',
	      onDelete: 'CASCADE', // Optional: Cascade delete
	    },
	    name: { type: 'varchar(255)', notNull: true },
	    num: { type: 'integer', default: 1 },
	    unit: { type: 'varchar(50)' },
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
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
	pgm.dropTable('shopping_list_items');
};
