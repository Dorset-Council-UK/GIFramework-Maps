class Spinner {
    
    static create(classes: string[] = []): HTMLDivElement {
        const element = document.createElement("div");
        element.classList.add(...["spinner", "spinner-border"].concat(classes));
        element.setAttribute("role", "status");
        element.setAttribute("counter", "0");
        return element;
    }

    static decrementCounter(spinner: HTMLDivElement) {
        let count = spinner.getAttribute("counter");
        if (!count) {
            spinner.setAttribute("counter", "0");
        } else {
            let newCountInt = parseInt(count) - 1;
            spinner.setAttribute("counter", newCountInt.toString());
        }
    }

    static hasCounter(spinner: HTMLElement) {
        let count = spinner.getAttribute("counter");
        if (!count || parseInt(count) <= 0) {
            return false;
        }
        return true;
    }

    static incrementCounter(spinner: HTMLDivElement) {
        let count = spinner.getAttribute("counter");
        if (!count) {
            spinner.setAttribute("counter", "1");
        } else {
            let newCountInt = parseInt(count) + 1;
            spinner.setAttribute("counter", newCountInt.toString());
        }
    }

    static readonly Small = () => { return Spinner.create(["spinner-border-sm"]) };

}

export default Spinner;