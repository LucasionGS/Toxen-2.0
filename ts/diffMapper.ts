export class DeepDiffMapper {
  static UNCHANGED: "Unchanged"
  static compare<DataType>(oldData: DataType, newData: DataType) {
    let changed: DataType[] = [];
  }

  private static objectHasChanged<DataType>(oldData: DataType, newData: DataType): boolean {
    for (const key in oldData) {
      if (Object.prototype.hasOwnProperty.call(oldData, key)) {
        if (JSON.stringify(oldData[key]) != JSON.stringify(oldData[key])) return false;
      }
    }
    return true;
  }
}