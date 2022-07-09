'use strict';

const Constants = require("../../../app/utils/Constants");
const ApiResponse = require("../ApiResponse");

/**
 * @class JsonResponse
 * @constructor
 * @extends ApiResponse
 * @description Class JsonResponse is used to send the response as json object
 * @version 1.0.0
 * @author Khdir, Abdullah <abdullahkhder77@gmail.com>
*/
module.exports =  class JsonResponse extends ApiResponse {

    #data;
    #message;
    constructor(message, data) {
        const _constants = Object.assign(new Constants());
        super(_constants.getConstants().HTTPS_STATUS.SUCCESS.OK, 'OK', message);
        this.#message = message;
        this.#data    = data;
    }
 
    sendAsJson(res) {
       return super.renderAsJson(res, Object.assign(this, {message: this.getMessage()}, {data: this.getData()}));
    }

    getData() {
        return this.#data;
    }

    getMessage() {
        return this.#message;
    }
 }