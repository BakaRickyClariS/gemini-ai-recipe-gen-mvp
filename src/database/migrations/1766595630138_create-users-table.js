export const up = (pgm) => {
	pgm.createTable('users', {
	    id: 'id',
	    username: { type: 'varchar(100)', notNull: true },
	    password: { type: 'varchar(255)' },
	    email: { type: 'varchar(255)', notNull: true, unique: true },
	    phone: { type: 'varchar(255)', unique: true },
	    avatar: { type: 'varchar(255)' },
	    line_id: { type: 'varchar(255)', unique: true },
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


export const down = (pgm) => {
	pgm.dropTable('users');
};
