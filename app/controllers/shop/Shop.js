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
            origin:               'http://localhost:8010.com',
            methods:              ['GET'],
            preflightContinue:    false,
            maxAge:               86400,
            allowedHeaders:       ['Content-Type', 'Authorization'],
            optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
        }
    }

    /**
     * @function products
     * @description products route
     * @version 1.0.0
     * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
     * @returns Response
    */
    products           = () => this._().get('/products/', Promise.asyncHandler(async (req, res, next) => {
        const user_products = req.session.currentUser.getProducts();
        user_products
            .then(rows => {
                return this.render(
                    res,
                    'shop/product-list',
                    {
                        products: rows ?? [],
                        page_title: 'All Products',
                        path: '/products/',
                        lodash: this.__
                    }
                );
            });
    }));

    /**
     * @function index
     * @description index route
     * @version 1.0.0
     * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
     * @returns Response
    */
    index              = () => this._().get('/', this.cors(this.corsOptions), Promise.asyncHandler(async (req, res, next) => {
        const user_products = req.session.currentUser.getProducts();
        user_products
            .then((rows) => {
                return this.render(
                    res,
                    'shop/index',
                    {
                        products: rows ?? [],
                        page_title: 'Shop',
                        path: '/',
                        lodash: this.__
                    }
                );
            })
            .catch(err => console.log(err)); 
    }));

    /**
     * @function cart
     * @description cart route
     * @version 1.0.0
     * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
     * @returns Response
    */
    cart               = () => this._().get('/cart/', Promise.asyncHandler(async (req, res, next) => {
        const user_cart = req.session.currentUser.getCart() ?? [];
        if (!user_cart) {
            throw new Error('User is not available');
        }
        user_cart
        .then(rows => {
            if (rows) {
                if (typeof rows['getProducts'] !== 'undefined') {
                    rows['getProducts']
                    .then(cart_products => {
                        if (cart_products['getProducts'].length > 0) {
                            cart_products = cart_products['getProducts'];
                            if (!this.__.isEmpty(cart_products)) {
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
                                    // console.log(cart_products);
                                    return this.render(
                                        res,
                                        'shop/cart',
                                        {
                                            page_title: 'My Cart',
                                            path : '/cart/',
                                            products: cart_products,
                                            lodash: this.__                                    
                                        }
                                    );
                                })
                                .catch(err => console.log(err));
                            }
                        } else {
                            return this.redirect(res, '/', this.constants.getConstants().HTTPS_STATUS.REDIRECTION.SEE_OTHER);
                        }
                    });
                } else {
                    return this.render(
                        res,
                        'shop/cart',
                        {
                            page_title: 'My Cart',
                            path : '/cart/',
                            products: [],
                            lodash: this.__                                           
                        }
                    );
                }
            } else {
                return this.render(
                    res,
                    'shop/cart',
                    {
                        page_title: 'My Cart',
                        path : '/cart/',
                        products: [],
                        lodash: this.__                                          
                    }
                );
            }
        })
        .catch(err => console.log(err));
    }));

    /**
     * @function postCart
     * @description postCart route
     * @version 1.0.0
     * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
     * @returns Response
    */
    postCart           = () => this._().post('/cart/', Promise.asyncHandler(async (req, res, next) => {
        const product_id = req.body.product_id ?? '';
        const user_id    = req.session.currentUser.id;

        this.cart_object.get({user_id: user_id}).then((rows) => {
            if (!this.__.isEmpty(rows)) {
                const cart_id = rows[0].id;  
                this.cart_items_object.filter({cart_id: cart_id, product_id: product_id}).then((cart_items_rows) => {
                    if (typeof cart_items_rows !== 'undefined') {
                        const quantity = cart_items_rows[0].quantity + 1;
                        const id       = cart_items_rows[0].id; 
                        this.cart_items_object.update({quantity: quantity}, id).then((check => {
                            if (check) {
                                return this.redirect(res, '/cart/');
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
                                return this.redirect(res, '/cart/');
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
                                        return this.redirect(res, '/cart/');
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
                                        return this.redirect(res, '/cart/');
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

    /**
     * @function checkout
     * @description checkout route
     * @version 1.0.0
     * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
     * @returns Response
    */
    checkout           = () => this._().get('/checkout/', Promise.asyncHandler(async (req, res, next) => {
        return this.render(
            res,
            'shop/checkout',
            {
                page_title: 'Checkout',
                path : '/checkout/'
            }
        );
    }));

    /**
     * @function orders
     * @description orders route
     * @version 1.0.0
     * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
     * @returns Response
    */
    orders             = () => this._().get('/orders/', Promise.asyncHandler(async (req, res, next) => {
        req.session.currentUser.getOrder().then(order => {
            order.getProducts.then(ordered_products => {
                if (!this.__.isEmpty(ordered_products.getProducts)) {
                    let where_clause;
                    ordered_products.getProducts.forEach((product, index) => {
                        if (index > 0) {
                            where_clause = where_clause + ' or id = '+ ordered_products.getProducts[index].product_id;
                        } else {
                            where_clause = 'id = '+ ordered_products.getProducts[index].product_id;
                        }
                    });
                    this.product.filter(where_clause)
                    .then(_products => {
                        ordered_products.getProducts.forEach((element, index) => {
                            _products.forEach((_product, _index) => {
                                if (+_product.id === +element.product_id) {
                                    ordered_products.getProducts[index].title = _products[_index].title 
                                }
                            });
                        });
                        return this.render(
                            res,
                            'shop/orders',
                            {
                                page_title: 'My Orders',
                                path : '/orders/',
                                orders : ordered_products.getProducts,
                                user_order_id : ordered_products.getProducts[0].order_id
                            }
                        );
                    })
                    .catch(err => {
                        console.log(err);
                    });
                } else {
                    return this.render(
                        res,
                        'shop/orders',
                        {
                            page_title: 'My Orders',
                            path : '/orders/',
                            orders : []
                        }
                    );
                }
            });
        })
        .catch(err => {
            console.log(err);
        });
    }));

    /**
     * @function postOrders
     * @description postOrders route
     * @version 1.0.0
     * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
     * @returns Response
    */
    postOrders         = () => this._().post('/create-order/', Promise.asyncHandler(async (req, res, next) => {
        const user_id    = req.session.currentUser.id;
        
        req.session.currentUser.getCart().then(cart => {
            if (cart) {
                if (cart['getProducts']) {
                    return cart['getProducts'].then(product => {
                        if (product) {
                            return product.getProducts;
                        }
                    });
                }
            }
        })
        .then(products => {
            if (products) {
                this.order_object.get({user_id: user_id}).then((rows) => {
                    if (!this.__.isEmpty(rows)) {
                        const order_id = rows[0].id;
                        products.forEach(product => {
                            if (product) {
                                this.cart_items_object.delete(product.id);
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
                                                    return this.redirect(res, '/orders/');
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
                                                            return this.redirect(res, '/orders/');
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
                                        this.cart_items_object.delete(product.id);
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
                                                            return this.redirect(res, '/orders/');
                                                        }
                                                    }
                                                });
                                            }
                                            if (!res.headersSent) {
                                                return this.redirect(res, '/orders/');
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

    /**
     * @function dynProductInfo
     * @description dynProductInfo route
     * @version 1.0.0
     * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
     * @returns Response
    */
    dynProductInfo     = () => this._().get('/products/:productId/', Promise.asyncHandler(async (req, res, next) => {
        let product_id = req.params.productId ?? false;
        const user_id = +req.session.currentUser.id ?? false;
        if (!isNaN(product_id)) {
            product_id = +product_id;
            this.product.get({id: product_id, user_id: user_id}).then(rows => {
                if (rows) {
                    const product = rows[0];
                    return this.render(
                        res,
                        'shop/product-detail',
                        {
                            page_title: product.title ?? 'Product Details',
                            path: '/products/',
                            product: product ?? [],
                            lodash: this.__
                        }
                    );
                } else {
                    return this.render(
                        res,
                        '404',
                        {page_title: 'Page not found', path: '/404/'},
                        null,
                        this.constants.getConstants().HTTPS_STATUS.CLIENT_ERRORS.SITE_NOT_FOUND
                    );
                }
            })
            .catch((err) => {
                throw err
            });
        } else {
            return this.render(
                res,
                '404',
                {page_title: 'Page not found', path: '/404/'},
                null,
                this.constants.getConstants().HTTPS_STATUS.CLIENT_ERRORS.SITE_NOT_FOUND
            );
        }
    }));
    
    /**
     * @function deleteCartProducts
     * @description deleteCartProducts route
     * @version 1.0.0
     * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
     * @returns Response
    */
    deleteCartProducts = () => this._().post('/cart/delete-items/', Promise.asyncHandler(async (req, res, next) => {
        const cart_item_product_id = req.body.product_id ?? false;
        if (cart_item_product_id) {
            this.cart_items_object.get({product_id: cart_item_product_id}).then((result) => {
                if (result) {
                    this.cart_items_object.delete({product_id: cart_item_product_id})
                        .then((result) => {
                            if (result[0].affectedRows > 0) {
                                this.order_items_object.filter({product_id: cart_item_product_id}).then(item => {
                                    if (typeof item !== 'undefined') {
                                        this.order_items_object.delete({product_id: cart_item_product_id})
                                        .then(_result => {
                                            if (_result[0].affectedRows > 0) {
                                                return this.redirect(res, '/cart/');
                                            }
                                        });
                                    } else {
                                        return this.redirect(res, '/cart/');
                                    }
                                });
                            }
                        })
                        .catch(err => console.log(err));
                }
            });
        }
    }));

    /**
     * @function deleteCartProduct
     * @description deleteCartProduct route
     * @version 1.0.0
     * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
     * @returns Response
    */
    deleteCartProduct  = () => this._().post('/cart/delete-item/', Promise.asyncHandler(async (req, res, next) => {
        const cart_item_product_id = req.body.product_id ?? false;
        if (cart_item_product_id) {
            this.cart_items_object.get({product_id: cart_item_product_id}).then((result) => {
                if (result) {
                    if (+result[0].product_id === +cart_item_product_id && result[0].quantity > 1) {
                        this.cart_items_object.update({quantity: result[0].quantity - 1}, result[0].id)
                            .then((result) => {
                                if (result) {
                                    return this.redirect(res, '/cart/');
                                }
                            })
                            .catch(err => console.log(err));
                    } else {
                        this.cart_items_object.delete({product_id: cart_item_product_id})
                            .then((result) => {
                                if (result[0].affectedRows > 0) {
                                    return this.redirect(res, '/cart/');
                                }
                            })
                            .catch(err => console.log(err));
                    }
                }
            });
        }
    }));
}