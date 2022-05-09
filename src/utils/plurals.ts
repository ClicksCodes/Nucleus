function addPlural(amount: any, unit: string) {
    if (amount === '1') return `${amount} ${unit}`
    return `${amount} ${unit}s`
}

export default addPlural;