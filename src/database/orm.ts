import { Sequelize, Op, DataTypes } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL);

const UserModel = sequelize.define('users', {
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING
    },
    email: {
        type: DataTypes.STRING
    },
    phone: {
        type: DataTypes.STRING
    },
    avatar: {
        type: DataTypes.STRING
    },
    line_id: {
        type: DataTypes.STRING
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
});

const GroupModel = sequelize.define('groups', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    admin_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    photo: {
        type: DataTypes.STRING
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
});

const GroupUserModel = sequelize.define('group_users', {
    group_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'groups',
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
});

const ShoppingListModel = sequelize.define('shopping_lists', {
    group_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'groups',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    start_buy_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_buy_date: {
        type: DataTypes.DATE,
        allowNull: false
    },
    is_notify: {
        type: DataTypes.BOOLEAN,
    },
    photo: {
        type: DataTypes.STRING
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
});

const ShoppingListItemModel = sequelize.define('shopping_list_items', {
    shopping_list_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'shopping_lists',
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    num: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    unit: {
        type: DataTypes.STRING
    },
    photo: {
        type: DataTypes.STRING
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
});

const NotificationModel = sequelize.define('notifications', {
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    category: DataTypes.STRING,
    type: DataTypes.STRING,
    actionType: DataTypes.STRING,
    title: DataTypes.STRING,
    description: DataTypes.STRING,
    isRead: DataTypes.BOOLEAN,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
});

const NotificationSettingModel = sequelize.define('notification_settings', {
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    notifyOnExpiry: DataTypes.BOOLEAN,
    daysBeforeExpiry: DataTypes.BOOLEAN,
    notifyOnLowStock: DataTypes.BOOLEAN,
    enablePush: DataTypes.BOOLEAN,
    enableEmail: DataTypes.BOOLEAN,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE
});

// Define association
GroupModel.belongsTo(UserModel, {
  foreignKey: 'admin_id',
  as: 'admin'
});

UserModel.belongsToMany(GroupModel, {
  through: GroupUserModel,
  as: 'groups',
  foreignKey: 'user_id',   // 指向 GroupUserModel 裡的 user_id
  otherKey: 'group_id'     // 指向 GroupUserModel 裡的 group_id
});

GroupModel.belongsToMany(UserModel, {
  through: GroupUserModel,
  as: 'members',
  foreignKey: 'group_id',  // 指向 GroupUserModel 裡的 group_id
  otherKey: 'user_id'      // 指向 GroupUserModel 裡的 user_id
});

GroupUserModel.belongsTo(GroupModel, { foreignKey: 'group_id', as: 'group' });
GroupUserModel.belongsTo(UserModel, { foreignKey: 'user_id', as: 'user' });

ShoppingListItemModel.belongsTo(UserModel, { foreignKey: 'user_id', as: 'user' });
NotificationModel.belongsTo(UserModel, { foreignKey: 'user_id', as: 'user' });
NotificationSettingModel.belongsTo(UserModel, { foreignKey: 'user_id', as: 'user' });


export {
    sequelize,
    Op,
    UserModel,
    GroupModel,
    GroupUserModel,
    ShoppingListModel,
    ShoppingListItemModel,
    NotificationModel,
    NotificationSettingModel
};
