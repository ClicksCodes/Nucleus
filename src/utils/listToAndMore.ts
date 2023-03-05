export default (list: string[], max: number) => {
    // PineappleFan, Coded, Mini (and 10 more)
    if (list.length > max) {
        return list.slice(0, max).join(", ") + ` (and ${list.length - max} more)`;
    }
    return list.join(", ");
};
