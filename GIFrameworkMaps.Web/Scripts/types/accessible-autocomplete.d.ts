declare module 'accessible-autocomplete' //{
//    import { ReactElement } from 'react-markdown/lib/react-markdown';

//    type SourceFunction = (
//        query: string,
//        populateResults: (values: string[]) => void
//    ) => string[];

//    /**
//     * This object defines templates (functions) that are used for displaying
//     * parts of the autocomplete. Caution: because this function allows you
//     * to output arbitrary HTML, you should make sure it's trusted, and accessible.
//     */
//    interface AutocompleteTemplates {
//        /**
//         * Receives one argument, the currently selected suggestion, and returns the
//         * string value to be inserted into the input.
//         */
//        inputValue(selectedSuggestion: string): string;

//        /**
//         * receives one argument, a suggestion to be displayed. It is used when
//         * rendering suggestions, and should return a string, which can contain HTML.
//         */
//        suggestion(suggestion: string): string;
//    }

//    export interface AccessibleAutocompleteProps {
//        /**
//         * The id to assign to the autocomplete input field, to use with a <label for=id>.
//         * Not required if using enhanceSelectElement.
//         */
//        id: string;

//        /**
//         * An array of values to search when the user types in the input field, or a function
//         * to take what the user types and call a callback function with the results to be displayed.
//         */
//        source: string[] | SourceFunction;

//        /**
//         * Set to true to highlight the first option when the user types in something and
//         * receives results. Pressing enter will select it. Default false.
//         */
//        autoselect?: boolean;

//        /**
//         * The autocomplete will confirm the currently selected option when the user clicks
//         * outside of the component. Set to false to disable. Default true.
//         */
//        confirmOnBlur?: boolean;

//        /**
//         * Use this property to override the BEM block name that the JavaScript component will use.
//         * You will need to rewrite the CSS class names to use your specified block name.
//         * Default "autocomplete".
//         */
//        cssNamespace?: string;

//        /**
//         * Specify a string to prefill the autocomplete with. Default "".
//         */
//        defaultValue?: string;

//        /**
//         * You can set this property to specify the way the menu should appear, whether inline or
//         * as an overlay. Default "inline"
//         */
//        displayMenu?: 'inline' | 'overlay';

//        /**
//         * The minimum number of characters that should be entered before the autocomplete will
//         * attempt to suggest options. When the query length is under this, the aria status region
//         * will also provide helpful text to the user informing them they should type in more.
//         * Default 0.
//         */
//        minLength?: number;

//        /**
//         * The name for the autocomplete input field, to use with a parent <form>.
//         * Default "input-autocomplete"
//         */
//        name?: string;

//        /**
//         * This function will be called when the user confirms an option, with the option they
//         * have confirmed.
//         * Default () => {}
//         */
//        onConfirm?(confirmed: string): void;

//        /**
//         * This option will populate the placeholder attribute on the input element.
//         * We think placeholders have usability issues and that there are better alternatives
//         * to input placeholder text, so we do not recommend using this option.
//         */
//        placeholder?: string;

//        /**
//         * The input field will be rendered with a required attribute, see W3C required
//         * attribute definition. Default false.
//         */
//        required?: boolean;

//        /**
//         * If this is set to true, all values are shown when the user clicks the input.
//         * This is similar to a default dropdown, so the autocomplete is rendered with
//         * a dropdown arrow to convey this behaviour. Default false.
//         */
//        showAllValues?: boolean;

//        /**
//         * The autocomplete will display a "No results found" template when there are
//         * no results. Default true.
//         */
//        showNoOptionsFound?: boolean;

//        /**
//         * This object defines templates (functions) that are used for displaying parts
//         * of the autocomplete.
//         * Caution: because this function allows you to output arbitrary HTML, you
//         * should make sure it's trusted, and accessible. If your template includes
//         * child elements with defined foreground or background colours, check they
//         * display correctly in forced colors modes. For example, Windows high contrast
//         * mode.
//         */
//        templates?: AutocompleteTemplates;

//        /**
//         * A function that gets passed an object with the property className
//         * ({ className: '' }) and should return a string of HTML or a (P)React element.
//         * Caution: because this function allows you to output arbitrary HTML, you
//         * should make sure it's trusted, and accessible.
//         * Default: A triangle pointing down
//         */
//        dropdownArrow?(props: { className: string }): string | ReactElement;

//        /**
//         * A function that receives no arguments and should return the text
//         * used in the dropdown to indicate that there are no results.
//         * Default: () => 'No results found'
//         */
//        tNoResults(): string;

//        /**
//         * A function that receives one argument that indicates the minimal
//         * amount of characters needed for the dropdown to trigger and should
//         * return the text used in the accessibility hint to indicate that
//         * the query is too short.
//         * Default: (minQueryLength) => `Type in ${minQueryLength} or more characters for results`
//         */
//        tStatusQueryTooShort(minQueryLength: number): string;

//        /**
//         * A function that receives no arguments and should return the text
//         * that is used in the accessibility hint to indicate that there are no results.
//         * Default: () => 'No search results'
//         */
//        tStatusNoResults(): string;

//        /**
//         * A function that receives two arguments, the selectedOption and the
//         * amount of available options, and it should return the text used in
//         * the accessibility hint to indicate which option is selected.
//         * Default: (selectedOption, length, index) =>
//         * `${selectedOption} ${index + 1} of ${length} is highlighted`
//         */
//        tStatusSelectedOption(
//            selectedOption: string,
//            length: number,
//            index: number
//        ): string;

//        /**
//         * A function that receives two arguments, the count of available options
//         * and the return value of tStatusSelectedOption, and should return the
//         * text used in the accessibility hint to indicate which options are
//         * available and which is selected.
//         * Default:
//         * (length, contentSelectedOption) => {
//         *   const words = {
//         *     result: (length === 1) ? 'result' : 'results',
//         *     is: (length === 1) ? 'is' : 'are'
//         *   }
//         *   return <span>{length} {words.result} {words.is} available. {contentSelectedOption}</span>
//         * }
//         */
//        tStatusResults(length: number, contentSelectedOption: number): string;

//        /**
//         * A function that receives no arguments and should return the text to
//         * be assigned as the aria description of the html input element, via
//         * the aria-describedby attribute. This text is intended as an initial
//         * instruction to the assistive tech user. The aria-describedby attribute
//         * is automatically removed once user input is detected, in order to
//         * reduce screen reader verbosity.
//         * Default:
//         * () => 'When autocomplete results are available use up and
//         *   down arrows to review and enter to select. Touch device users,
//         *   explore by touch or with swipe gestures.'
//         */
//        tAssistiveHint(): string;
//    }

//    export default function AccessibleAutocomplete(
//        props: AccessibleAutocompleteProps
//    ): ReactElement | null;
//}