'use strict';

const BaseModel = require("../../../core/model/BaseModel");
const Lodash    = require("../../utils/Lodash");

/**
 * @class User
 * @constructor
 * @extends BaseModel
 * @description Defining Model User
 * @version 1.0.0
 * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
*/
module.exports = class User extends BaseModel {
    constructor() {
        super();

        this.table = 'node.users';
        this.reverse_references = {
            product_user_id: {
                table: 'node.products',
                class: 'shop/Products',
                column: 'user_id'
            },
            cart_user_id: {
                table: 'node.carts',
                class: 'shop/Cart',
                column: 'user_id'
            }
        };
        this.columns = {
            id: {
                label: 'id'
            },
            name: {
                label: 'name'
            },
            email: {
                label: 'email'
            },
            created_at: {
                label: 'created_at'
            },
            updated_at: {
                label: 'updated_at'
            }
        };

        this.__ = new Lodash().__;
    }

};