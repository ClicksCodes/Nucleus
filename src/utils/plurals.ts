function addPlural(amount: number | string, unit: string) {
    amount = amount.toString();
    if (amount === "1") return `${amount} ${unit}`;
    return `${amount} ${unit}s`;
}

export default addPlural;