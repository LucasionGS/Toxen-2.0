export declare class DeepDiffMapper {
    static UNCHANGED: "Unchanged";
    static compare<DataType>(oldData: DataType, newData: DataType): void;
    private static objectHasChanged;
}
