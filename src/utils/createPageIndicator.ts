import getEmojiByName from "./getEmojiByName.js";

function pageIndicator(
    amount: number,
    selected: number,
    showDetails?: boolean,
    disabled?: boolean | string | boolean[]
) {
    let out = "";
    // disabled = disabled ? "GRAY." : "";
    // If disabled is a string, make a list of booleans the same length as amount.
    if (!Array.isArray(disabled)) disabled = new Array(amount).fill(disabled);
    // If the length is wrong, fill extra with false
    if (disabled.length !== amount) {
        disabled = disabled.concat(new Array(amount).fill(false));
    }
    const grey = disabled.map((x) => (x ? "GRAY." : ""));
    if (amount === 1) {
        out += getEmojiByName("TRACKS.SINGLE." + grey[0] + (selected === 0 ? "ACTIVE" : "INACTIVE"));
    } else {
        for (let i = 0; i < amount; i++) {
            out += getEmojiByName(
                "TRACKS.HORIZONTAL." +
                    (i === 0 ? "LEFT" : i === amount - 1 ? "RIGHT" : "MIDDLE") +
                    "." +
                    grey[i] +
                    (i === selected ? "ACTIVE" : "INACTIVE")
            );
        }
    }
    if (showDetails) {
        out += " Page " + selected + " of " + amount;
    }
    return out;
}

export const verticalTrackIndicator = (
    position: number,
    active: string | boolean,
    size: number,
    disabled: string | boolean
) => {
    active = active ? "ACTIVE" : "INACTIVE";
    disabled = disabled ? "GRAY." : "";
    if (position === 0 && size === 1) return "TRACKS.SINGLE." + disabled + active;
    if (position === size - 1) return "TRACKS.VERTICAL.BOTTOM." + disabled + active;
    if (position === 0) return "TRACKS.VERTICAL.TOP." + disabled + active;
    return "TRACKS.VERTICAL.MIDDLE." + disabled + active;
};

export const createVerticalTrack = (items: string[], active: boolean[], disabled?: boolean[]) => {
    let out = "";
    if (!disabled) disabled = new Array(items.length).fill(false);
    for (let i = 0; i < items.length; i++) {
        out += getEmojiByName(verticalTrackIndicator(i, active[i] ?? false, items.length, disabled[i] ?? false));
        out += items[i] + "\n";
    }
    return out;
};

export default pageIndicator;
