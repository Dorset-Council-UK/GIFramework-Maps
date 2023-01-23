class Badge {

    static create(content: string, classes: string[] = []) {
        const element = document.createElement("span");
        element.innerHTML = content;
        element.classList.add(...["badge"].concat(classes));
        return element;
    }

    static readonly Error = () => { return Badge.create("Error", ["badge-error", "rounded-pill", "border", "bg-danger"]) };
    static readonly Invisible = () => { return Badge.create("Invisible", ["badge-invisible", "rounded-pill", "border", "border-secondary", "text-secondary"]) };
    static readonly OutOfRange = () => { return Badge.create("Out of range", ["badge-out-of-range", "rounded-pill", "border", "bg-warning", "text-dark"]) };

}

export default Badge;