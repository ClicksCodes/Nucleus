import Fuse from "fuse.js";

function getResults(typed: string, options: string[]): string[] {
    options = options.filter((option) => option.length <= 100); // thanks discord. 6000 character limit on slash command inputs but only 100 for autocomplete.
    if (!typed)
        return options
            .slice(0, 25)
            .sort()
    // @ts-expect-error
    const fuse = new Fuse(options, {
        useExtendedSearch: true,
        findAllMatches: true,
        minMatchCharLength: typed.length > 3 ? 3 : typed.length,
    }).search(typed);
    return fuse.slice(0, 25).map((option: {item: string }) => option.item );
}

export { getResults }