class Result<DataType = any>
{
  public success: boolean;
  public reason: string = null;
  public data: DataType = null;
  constructor(success: boolean, reason: string = null, data: DataType = null, dataName = "data") {
    this.success = success;
    if (reason != null) this.reason = reason;

    if (data != null) {
      this.data = data;
    }
  }
}

export default Result;