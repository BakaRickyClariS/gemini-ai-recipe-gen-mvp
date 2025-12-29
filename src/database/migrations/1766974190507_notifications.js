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
	pgm.createType('notification_category', ['stock', 'inspiration', 'official']);
	pgm.createType('notification_type', ['stock', 'shared', 'system']);
	pgm.createType('notification_action_type', ['global', 'inventory', 'shopping-list', 'recipe', 'detail']);


	pgm.createTable('notifications', {
		id: 'id',
		user_id: {
	      type: 'integer',
	      notNull: true,
	      // Creates FK: admin_id REFERENCES users(id)
	      references: '"users"',
	      onDelete: 'CASCADE', // Optional: Cascade delete
	    },
		category: {
		    type: 'notification_category',
			notNull: true,
		    default: 'official',
		},
		type: {
		    type: 'notification_type',
		    notNull: true,
		    default: 'system',
		},
		actionType: {
		    type: 'notification_action_type',
		    notNull: true,
		    default: 'global',
		},
	    title: { type: 'varchar(100)', notNull: true }, // 標題
		description: { type: 'varchar(255)' }, // 內容描述
		isRead: { type: 'boolean', default: false }, // 是否已讀
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
	pgm.dropTable('notifications');
  	pgm.dropType('notification_category');
  	pgm.dropType('notification_type');
  	pgm.dropType('notification_action_type');
};
