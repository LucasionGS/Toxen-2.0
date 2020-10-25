"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepDiffMapper = void 0;
class DeepDiffMapper {
    static compare(oldData, newData) {
        let changed = [];
    }
    static objectHasChanged(oldData, newData) {
        for (const key in oldData) {
            if (Object.prototype.hasOwnProperty.call(oldData, key)) {
                if (JSON.stringify(oldData[key]) != JSON.stringify(oldData[key]))
                    return false;
            }
        }
        return true;
    }
}
exports.DeepDiffMapper = DeepDiffMapper;
