declare class Result<DataType = any> {
    success: boolean;
    reason: string;
    data: DataType;
    constructor(success: boolean, reason?: string, data?: DataType, dataName?: string);
}
export default Result;
