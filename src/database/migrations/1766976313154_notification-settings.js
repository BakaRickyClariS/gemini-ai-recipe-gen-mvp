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
	pgm.createTable('notification_settings', {
		id: 'id',
		user_id: {
	      type: 'integer',
	      notNull: true,
	      // Creates FK: admin_id REFERENCES users(id)
	      references: '"users"',
	      onDelete: 'CASCADE', // Optional: Cascade delete
	    },
		notifyOnExpiry: { type: 'boolean', default: true },
		notifyOnLowStock: { type: 'boolean', default: true },
		daysBeforeExpiry: { type: 'boolean', default: true },
	    enablePush: { type: 'boolean', default: true },
		enableEmail: { type: 'boolean', default: true },
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
	pgm.dropTable('notification_settings');
};
