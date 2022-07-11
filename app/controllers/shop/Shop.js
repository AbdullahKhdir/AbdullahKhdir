'use strict';

const BaseController  = require("../../../core/controller/BaseController");
const Promise         = require("../../../core/utils/Promise");
const Cart            = require("../../models/shop/Cart");
const Order           = require("../../models/shop/Order");
const CartItem        = require("../../models/shop/CartItem");
const OrderItem       = require("../../models/shop/OrderItem");
const Product         = require("../../models/shop/Product");
const Constants       = require("../../utils/Constants");

/**
 * @class Shop
 * @constructor
 * @extends BaseController
 * @description Class Shop is the main controller
 * @version 1.0.0
 * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
*/
module.exports = class Shop extends BaseController{
    constructor() {
        super();
        /**
        * ! DYNAMIC ROUTES MUST BE THE LAST INDEX OF THE METHODS ARRAY
        */
        this.methods = [
            'products',
            'index',
            'cart',
            'checkout',
            'orders',
            'postOrders',
            'postCart',
            'deleteCartProducts',
            'deleteCartProduct',
            'dynProductInfo'
        ];
        this.product            = new Product();
        this.cart_object        = new Cart();
        this.order_object       = new Order();
        this.cart_items_object  = new CartItem();
        this.order_items_object = new OrderItem();
        this.constants          = Object.assign(new Constants);

        /*
         ? DEMO OF THE CORS CONFIGURATIONS 
         */
        this.corsOptions = {
            origin:               'http://localhost:9009.com',
            methods:              ['GET'],
            preflightContinue:    false,
            maxAge:               86400,
            allowedHeaders:       ['Content-Type', 'Authorization'],
            optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
        }
    }

    products           = () => this.getRouterInstance().get('/products/', Promise.asyncHandler(async (req, res, next) => {
        const user_products = req.registered_user.getProducts();
        user_products
            .then(rows => {
                return this.render(
                    res,
                    'shop/product-list',
                    {
                        products: rows ?? [],
                        page_title: 'All Products',
                        path: '/products/',
                        lodash: this._
                    }
                );
            });
    }));

    index              = () => this.getRouterInstance().get('/', this.cors(this.corsOptions), Promise.asyncHandler(async (req, res, next) => {
        const user_products = req.registered_user.getProducts();
        user_products
            .then((rows) => {
                return this.render(
                    res,
                    'shop/index',
                    {
                        products: rows ?? [],
                        page_title: 'Shop',
                        path: '/',
                        lodash: this._
                    }
                );
            })
            .catch(err => console.log(err)); 
    }));

    cart               = () => this.getRouterInstance().get('/cart/', Promise.asyncHandler(async (req, res, next) => {
        const user_cart = req.registered_user.getCart();
        if (!user_cart) {
            throw new Error('User is not availabel');
        }
        user_cart
        .then(rows => {
            if (rows['getProducts']) {
                rows['getProducts']
                .then(users_cart => {
                    users_cart['getProducts'].then(cart_products => {
                        if (cart_products.length > 0) {
                            if (!this._.isEmpty(cart_products)) {
                                let where_clause;
                                cart_products.forEach((cart_product, index) => {
                                    if (index > 0) {
                                        where_clause = where_clause + ' or id = '+ cart_products[index].product_id;
                                    } else {
                                        where_clause = 'id = '+ cart_products[index].product_id;
                                    }
                                });
                                this.product.filter(where_clause)
                                .then((rows) => {
                                    cart_products.forEach((cart_product, index) => {
                                        cart_products[index]['title']      = rows[index].title;
                                        cart_products[index]['product_id'] = rows[index].id;
                                    });
                                    return this.render(
                                        res,
                                        'shop/cart',
                                        {
                                            page_title: 'My Cart',
                                            path : '/cart/',
                                            products: cart_products,
                                            lodash: this._                                            
                                        }
                                    );
                                })
                                .catch(err => console.log(err));
                            }
                        } else {
                            res.redirect(this.constants.getConstants().HTTPS_STATUS.REDIRECTION.SEE_OTHER, '/');
                        }
                    });
                });
            }
        })
        .catch(err => console.log(err));
    }));

    postCart           = () => this.getRouterInstance().post('/cart/', Promise.asyncHandler(async (req, res, next) => {
        const product_id = req.body.product_id ?? '';
        const user_id    = req.registered_user.id;

        this.cart_object.get({user_id: user_id}).then((rows) => {
            if (!this._.isEmpty(rows)) {
                const cart_id = rows[0].id;  
                this.cart_items_object.filter({cart_id: cart_id, product_id: product_id}).then((cart_items_rows) => {
                    if (typeof cart_items_rows !== 'undefined') {
                        const quantity = cart_items_rows[0].quantity + 1;
                        const id       = cart_items_rows[0].id; 
                        this.cart_items_object.update({quantity: quantity}, id).then((check => {
                            if (check) {
                                res.redirect('/cart/');
                            }
                        }));
                    } else {
                        const cart_item_params = {
                            cart_id: +cart_id,
                            product_id: +product_id,
                            quantity: 1
                        };
                        this.cart_items_object.create(cart_item_params).then((cart_item_element) => {
                            if (cart_item_element) {
                                res.redirect('/cart/');
                            }
                        });
                    }
                });   
            } else {
                const cart_params = {
                    user_id: user_id
                };

                this.cart_object.create(cart_params)
                .then(cart_element => {
                    const id = cart_element[0].insertId;
                    if (id) {
                        this.cart_items_object.filter({cart_id: id, product_id: product_id}).then((cart_items_rows) => {
                            if (typeof cart_items_rows !== 'undefined') {
                                const quantity = cart_items_rows[0].quantity + 1;
                                const id       = cart_items_rows[0].id; 
                                this.cart_items_object.update({quantity: quantity}, id).then((check => {
                                    if (check) {
                                        res.redirect('/cart/');
                                    }
                                }));
                            } else {
                                const cart_item_params = {
                                    cart_id: +id,
                                    product_id: +product_id,
                                    quantity: 1
                                };
                                this.cart_items_object.create(cart_item_params).then((cart_item_element) => {
                                    if (cart_item_element) {
                                        res.redirect('/cart/');
                                    }
                                });
                            }
                        });  
                    }
                })
                .catch((err) => { throw err});
            }
        });
    }));

    checkout           = () => this.getRouterInstance().get('/checkout/', Promise.asyncHandler(async (req, res, next) => {
        res.render(
            'shop/checkout',
            {
                page_title: 'Checkout',
                path : '/checkout/'
            }
        );
    }));

    orders             = () => this.getRouterInstance().get('/orders/', Promise.asyncHandler(async (req, res, next) => {
        res.render(
            'shop/orders',
            {
                page_title: 'My Orders',
                path : '/orders/'
            }
        );
    }));

    postOrders         = () => this.getRouterInstance().post('/create-order/', Promise.asyncHandler(async (req, res, next) => {
        const user_id    = req.registered_user.id;
        
        req.registered_user.getCart().then(cart => {
            if (cart) {
                if (cart['getProducts']) {
                    return cart['getProducts'].then(product => {
                        if (product) {
                            if (product.getProducts) {
                                return product.getProducts.then(item => {
                                    if (item) {
                                        return item;
                                    }
                                });
                            }
                        }
                    });
                }
            }
        })
        .then(products => {
            if (products) {
                this.order_object.get({user_id: user_id}).then((rows) => {
                    if (!this._.isEmpty(rows)) {
                        const order_id = rows[0].id;
                        products.forEach(product => {
                            if (product) {
                                this.order_items_object.filter({order_id: order_id, product_id: product.product_id}).then((order_items_rows) => {
                                    if (typeof order_items_rows === 'undefined') {
                                        const order_item_params = {
                                            order_id: +order_id,
                                            product_id: +product.product_id,
                                            quantity: product.quantity
                                        };
                                        this.order_items_object.create(order_item_params).then((order_item_element) => {
                                            if (order_item_element) {
                                                if (!res.headersSent) {
                                                    res.redirect('/orders/');
                                                }
                                            }
                                        });
                                    } else if (typeof order_items_rows !== 'undefined') {
                                        order_items_rows.forEach(order_items_row => {
                                            this.order_items_object.filter({id: order_items_row.id}).then(item => {
                                                let order_item_id = item[0].id;
                                                let order_item_params = {
                                                    order_id: +order_id,
                                                    product_id: +product.product_id,
                                                    quantity: product.quantity
                                                };
                                                this.order_items_object.update(order_item_params, order_item_id).then((order_item_element) => {
                                                    if (order_item_element) {
                                                        if (!res.headersSent) {
                                                            res.redirect('/orders/');
                                                        }
                                                    }
                                                });
                                            });
                                        });
                                    }
                                });   
                            }
                        });
                    } else {
                        const order_params = {
                            user_id: user_id
                        };
        
                        this.order_object.create(order_params)
                        .then(order_element => {
                            const id = order_element[0].insertId;
                            if (id) {
                                products.forEach(product => {
                                    if (product) {
                                        this.order_items_object.filter({order_id: id, product_id: product.product_id}).then((order_items_rows) => {
                                            if (typeof order_items_rows === 'undefined') {
                                                const order_item_params = {
                                                    order_id:   +id,
                                                    product_id: +product.product_id,
                                                    quantity:   product.quantity
                                                };
                                                this.order_items_object.create(order_item_params).then((order_item_element) => {
                                                    if (order_item_element) {
                                                        if (!res.headersSent) {
                                                            res.redirect('/orders/');
                                                        }
                                                    }
                                                });
                                            }
                                            if (!res.headersSent) {
                                                res.redirect('/orders/');
                                            }
                                        });  
                                    }
                                });
                            }
                        })
                        .catch((err) => { throw err});
                    }
                });
            }
        });
    }));

    dynProductInfo     = () => this.getRouterInstance().get('/products/:productId/', Promise.asyncHandler(async (req, res, next) => {
        const product_id = +req.params.productId ?? false;
        const user_id = +req.registered_user.id ?? false;
        
        this.product.get({id: product_id, user_id: user_id}).then(rows => {
            if (rows) {
                const product = rows[0];
                res.render(
                    'shop/product-detail',
                    {
                        page_title: product.title ?? 'Product Details',
                        path: '/products/',
                        product: product ?? [],
                        lodash: this._
                    }
                );
            }
        })
        .catch((err) => {
            throw err
        });
    }));
    
    deleteCartProducts = () => this.getRouterInstance().post('/cart/delete-items/', Promise.asyncHandler(async (req, res, next) => {
        const cart_item_product_id = req.body.product_id ?? false;
        if (cart_item_product_id) {
            this.cart_items_object.filter({product_id: cart_item_product_id}).then((result) => {
                if (result) {
                    this.cart_items_object.delete({product_id: cart_item_product_id})
                        .then((result) => {
                            if (result[0].affectedRows > 0) {
                                this.order_items_object.filter({product_id: cart_item_product_id}).then(item => {
                                    if (typeof item !== 'undefined') {
                                        this.order_items_object.delete({product_id: cart_item_product_id})
                                        .then(_result => {
                                            if (_result[0].affectedRows > 0) {
                                                res.redirect('/cart/');             
                                            }
                                        });
                                    } else {
                                        res.redirect('/cart/');
                                    }
                                });
                            }
                        })
                        .catch(err => console.log(err));
                }
            });
        }
    }));

    deleteCartProduct  = () => this.getRouterInstance().post('/cart/delete-item/', Promise.asyncHandler(async (req, res, next) => {
        const cart_item_product_id = req.body.product_id ?? false;
        if (cart_item_product_id) {
            this.cart_items_object.filter({product_id: cart_item_product_id}).then((result) => {
                if (result) {
                    if (result[0].quantity > 1) {
                        this.cart_items_object.update({quantity: result[0].quantity - 1}, result[0].id)
                            .then((result) => {
                                if (result) {
                                    res.redirect('/cart/');
                                }
                            })
                            .catch(err => console.log(err));
                    } else {
                        this.cart_items_object.delete({product_id: cart_item_product_id})
                            .then((result) => {
                                if (result[0].affectedRows > 0) {
                                    res.redirect('/cart/');
                                }
                            })
                            .catch(err => console.log(err));
                    }
                }
            });
        }
    }));
}