import getEmojiByName from "./getEmojiByName.js";

function pageIndicator(amount: number, selected: number, showDetails?: boolean, disabled?: boolean | string) {
    let out = "";
    disabled = disabled ? "GREY." : ""
    if (amount === 1) {
        out += getEmojiByName("TRACKS.SINGLE." + (disabled) + (selected === 0 ? "ACTIVE" : "INACTIVE"));
    } else {
        for (let i = 0; i < amount; i++) {
            out += getEmojiByName(
                "TRACKS.HORIZONTAL." +
                (i === 0 ? "LEFT" : i === amount - 1 ? "RIGHT" : "MIDDLE") +
                "." + (disabled) +
                (i === selected ? "ACTIVE" : "INACTIVE")
            );
        }
    }
    if (showDetails) {
        out += " Page " + selected + " of " + amount;
    }
    return out;
}

export default pageIndicator;
