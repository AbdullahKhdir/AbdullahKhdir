"use strict";

const Routes      = require("../routes/Route");
const Path        = require("../node/Path");
const FileSystem  = require("../node/FileSystem");
const Lodash      = require("../../app/utils/Lodash");
const Application = require("../../app/Application");
const Constants   = require("../../app/utils/Constants");

/**
 * @class BaseController
 * @constructor
 * @extends Routes
 * @description 
 * Class BaseController is used to define the controllers 
 * and deploy all the defined routes in the controller's folder
 * @version 1.0.0
 * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
*/
module.exports = class BaseController extends Routes {
    constructor() {
        super();
        this.path        = Object.assign(new Path().path);
        this.file_system = Object.assign(new FileSystem().fs);
        this.__          = Object.assign(new Lodash().__);
    }

    /**
     * @function deployRoutes
     * @description
     * * Will automatically scann the controllers
     * * directory and loop each controller file 
     * * and initiate new instance of each controller
     * * class and loop the methods array for any declared
     * * routes that will be deployed by the app via express
     * @version 1.0.0
     * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
     * @param {Application} app
     * @return void
     */
    deployRoutes(app) {
        let directory_routes = this.path.join(__dirname, '..', '..', 'app', 'controllers');
        let methods_array = null;
        this.file_system.readdir(directory_routes, { withFileTypes: true }, (err, files) => {
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            } 
            
            /*
            * is a directory or is a file
            */
            files.forEach((file) => {
                let is_dir  = file.isDirectory();
                let is_file = file.isFile(); 
                if (is_file) {
                    /*
                     * let content   = this.file_system.readFileSync(directory_routes+'/'+file);
                    */

                    let file_name    = this.__.capitalize(file.name.substring(0, file.name.indexOf('js') - 1));
                    let route_name   = require('../../app/controllers/'+file_name+'.js');
                    let instance_of  = new route_name();

                    methods_array    = instance_of.methods;
                    if(methods_array.length > 0) {
                        methods_array.forEach((route) => {
                            eval('app.use(instance_of.'+route+'());');
                        });
                    }
                } else if (is_dir) {
                    let directory_name = file.name;
                    this.file_system.readdir(directory_routes+'/'+file.name, { withFileTypes: true }, (err, files) => {
                        if (err) {
                            return console.log('Unable to scan directory: ' + err);
                        }
                        
                        files.forEach((file) => {
                            let is_file = file.isFile(); 
                            if (is_file) {
                                let file_name    = this.__.capitalize(file.name.substring(0, file.name.indexOf('js') - 1));
                                let route_name   = require(
                                    '../../app/controllers/'+directory_name+'/'+file_name+'.js'
                                );
                                let instance_of  = new route_name();
            
                                methods_array    = instance_of.methods;
                                if(methods_array.length > 0) {
                                    methods_array.forEach((route) => {
                                        eval('app.use(instance_of.'+route+'());');
                                    });
                                }
                            }
                        });
                    });
                }
            });
        });
        
        this.undefinedRoutes(app);
    }

    /**
     * @function undefinedRoutes
     * @description
     * * Handles all incoming requests
     * * can be used to issue a requests tests
     * * or parsing or even filtering
     * * all requests will be checked if
     * * their path is a valid path
     * * if not it will render 404 page
     * * it acceptes all kind of routes with (next())
     * @version 1.0.0
     * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
     * @param {Application} app
     * @return void
     */
    undefinedRoutes(app) {
        let site_is_found              = false;
        let is_post_request_successful = false;
        let _constants                 = new Constants().getConstants();
        
        app.use(this._().get('*', (req, res, next) => {
            let route, routes = [];
            
            app._router.stack.forEach((middleware) => {
                if(middleware.route){ // routes registered directly on the app
                    routes.push(middleware.route);
                } else if(middleware.name === 'router'){ // router middleware 
                    middleware.handle.stack.forEach(function(handler){
                        route = handler.route;
                        route && routes.push(route);
                    });
                }
            });

            let route_exists = routes.filter(route => {
                return route.path.toString() === req.path.toString();
            });
            
            routes.forEach(route => {
                let check_path = req.path.toString().slice(1, req.path.toString().length);
                let direction  = Object.assign(route.path.slice(1, route.path.length));
                
                let predefined_direction_from_route = this.__.toLower(direction.toString());
                let requested_path_in_browser       = this.__.toLower(check_path.toString());
                
                /*
                * "/route" is same as "/route/"
                */
                if (this.__.endsWith(requested_path_in_browser, '/') || this.__.endsWith(predefined_direction_from_route, '/')) {
                    requested_path_in_browser       = this.__.trimEnd(requested_path_in_browser, '/');
                    predefined_direction_from_route = this.__.trimEnd(predefined_direction_from_route, '/');
                }      

                if (predefined_direction_from_route.includes(':')) {
                    const _predefined_direction_from_route        = predefined_direction_from_route.substr(0, predefined_direction_from_route.indexOf(':') - 1);
                    const _requested_path_in_browser              = requested_path_in_browser.substr(0, requested_path_in_browser.lastIndexOf('/'));
                    if (_predefined_direction_from_route === _requested_path_in_browser) {
                        if (this.__.isEmpty(route_exists)) {
                            route_exists = 'dynamic routes';
                        }
                        site_is_found    = true;
                    }
                }
                
                if (predefined_direction_from_route === requested_path_in_browser && route.methods.get) {
                    site_is_found = true;
                }
            });

            if (this.__.isEmpty(route_exists)) {
                return this.render(
                    res,
                    '404',
                    {page_title: 'Page not found', path: '/404/'},
                    null,
                    _constants.HTTPS_STATUS.CLIENT_ERRORS.SITE_NOT_FOUND
                );
            }

            if (site_is_found === true) {
                next();
                site_is_found = false;
            } else {
                return this.render(
                    res,
                    '404',
                    {page_title: 'Page not found', path: '/404/'},
                    null,
                    _constants.HTTPS_STATUS.CLIENT_ERRORS.SITE_NOT_FOUND
                );
            }
        }));

        app.use(this._().post('*', (req, res, next) => {
            let route, routes = [];
            
            app._router.stack.forEach(function(middleware){
                if(middleware.route){ // routes registered directly on the app
                    routes.push(middleware.route);
                } else if(middleware.name === 'router'){ // router middleware 
                    middleware.handle.stack.forEach(function(handler){
                        route = handler.route;
                        route && routes.push(route);
                    });
                }
            });

            let route_exists = routes.filter(route => {
                return route.path.toString() === req.path.toString();
            })

            routes.forEach(route => {
                let check_path = req.path.toString().slice(1, req.path.toString().length);
                let direction  = Object.assign(route.path.slice(1, route.path.length));
                
                let predefined_direction_from_route = this.__.toLower(direction.toString());
                let requested_path_in_browser       = this.__.toLower(check_path.toString());
                
                /*
                * "/route" is same as "/route/"
                */
                if (this.__.endsWith(requested_path_in_browser, '/') || this.__.endsWith(predefined_direction_from_route, '/')) {
                    requested_path_in_browser       = this.__.trimEnd(requested_path_in_browser, '/');
                    predefined_direction_from_route = this.__.trimEnd(predefined_direction_from_route, '/');
                }
                
                if (predefined_direction_from_route.includes(':')) {
                    const _predefined_direction_from_route        = predefined_direction_from_route.substr(0, predefined_direction_from_route.indexOf(':') - 1);
                    const _requested_path_in_browser              = requested_path_in_browser.substr(0, requested_path_in_browser.lastIndexOf('/'));
                    if (_predefined_direction_from_route === _requested_path_in_browser) {
                        if (this.__.isEmpty(route_exists)) {
                            route_exists = 'dynamic routes';
                        }
                        is_post_request_successful = true;
                    }
                }
                
                if (predefined_direction_from_route === requested_path_in_browser && route.methods.post) {
                    is_post_request_successful = true;
                }
            });

            if (this.__.isEmpty(route_exists)) {
                return this.render(
                    res,
                    '404',
                    {page_title: 'Cannot post!', path: '/404/', onPost: 'Route does not support posting requests!'},
                    null,
                    _constants.HTTPS_STATUS.SERVER_ERRORS.INTERNAL_SERVER_ERROR
                );
            }
            
            if (is_post_request_successful === true) {
                next();
                is_post_request_successful = false;
            } else {
                return this.render(
                    res,
                    '404',
                    {page_title: 'Cannot post!', path: '/404/', onPost: 'Route does not support posting requests!'},
                    null,
                    _constants.HTTPS_STATUS.SERVER_ERRORS.INTERNAL_SERVER_ERROR
                );
            }
        }));
    }
}