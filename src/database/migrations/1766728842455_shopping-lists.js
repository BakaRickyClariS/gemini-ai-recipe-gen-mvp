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
	pgm.createTable('shopping_lists', {
	    id: 'id',
	    group_id: {
	      type: 'integer',
	      notNull: true,
	      // Creates FK: admin_id REFERENCES users(id)
	      references: '"groups"',
	      onDelete: 'CASCADE', // Optional: Cascade delete
	    },
	    name: { type: 'varchar(255)', notNull: true },
	    start_buy_date: { type: 'datetime', notNull: true },
	    end_buy_date: { type: 'datetime', notNull: true },
	    is_notify: { type: 'boolean', default: false },
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
	pgm.dropTable('shopping_lists');
};
