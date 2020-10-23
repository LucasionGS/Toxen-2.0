"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Result {
    constructor(success, reason = null, data = null, dataName = "data") {
        this.reason = null;
        this.data = null;
        this.success = success;
        if (reason != null)
            this.reason = reason;
        if (data != null) {
            this.data = data;
        }
    }
}
exports.default = Result;
