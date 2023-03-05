export default (str: string, max: number): string => {
    if (str.length <= max) return str;
    return str.slice(0, max - 3) + "...";
};
