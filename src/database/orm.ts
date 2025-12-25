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


export {
    sequelize,
    Op,
    UserModel,
    GroupModel,
    GroupUserModel
};
