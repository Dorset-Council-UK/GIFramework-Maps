///CQL format reader and writer
///Based on https://github.com/geostyler/geostyler-cql-parser/blob/master/src/CqlParser.ts
///and https://github.com/openlayers/ol2/blob/ab7a809ebad7055d9ada4170aed582d7be4a7b77/lib/OpenLayers/Format/CQL.js

import Filter from "ol/format/filter/Filter";
import * as olFilter from "ol/format/filter";
import WKT from "ol/format/WKT";
import EqualTo from "ol/format/filter/EqualTo";
import IsNull from "ol/format/filter/IsNull";
import IsLike from "ol/format/filter/IsLike";
import IsBetween from "ol/format/filter/IsBetween";
import And from "ol/format/filter/And";
import Or from "ol/format/filter/Or";
import Not from "ol/format/filter/Not";

type PatternName = 'PROPERTY' | 'COMPARISON' | 'VALUE' | 'LOGICAL' | 'LPAREN' | 'RPAREN'
    | 'SPATIAL' | 'NOT' | 'BETWEEN' | 'GEOMETRY' | 'END' | 'COMMA' | 'IS_NULL';
type Pattern = RegExp | ((arg0: string) => void);
type PatternsObject = {
    [name: string]: Pattern;
};
type FollowsObject = {
    [name: string]: PatternName[];
};
type CqlOperator = '=' | '<>' | '<' | '<=' | '>' | '>=' | 'LIKE' | 'BETWEEN' | 'IS NULL';
type CombinationOperator = '&&' | '||';
type ComparisonOperator = '==' | '*=' | '!=' | '<' | '<=' | '>' | '>=' | '<=x<=';
type NegationOperator = '!';
type StrMatchesFunctionOperator = 'FN_strMatches';
type Operator = ComparisonOperator | CombinationOperator | NegationOperator | StrMatchesFunctionOperator;
type OperatorsMap = {
    [cqlOperator: string]: Operator;
};
type CombinationOperatorsMap = {
    [cqlOperator: string]: CombinationOperator;
};
type OperatorsReverseMap = {
    [cqlOperator: string]: CqlOperator;
};
type CombinationOperatorsReverseMap = {
    [cqlOperator: string]: 'AND' | 'OR';
};
type PrecedenceMap = {
    [name: string]: 1 | 2 | 3;
};
type Token = {
    type: string;
    text: string;
    remainder: string;
};


type Operators = {
    [cqlOperator: string]: any;
}

export type FilterType = {
    tagName: string;
    cqlTag: string;
    friendlyName: string;
    description: string;
    type: "logical" | "singleValue" | "twoValue" | "nullValue" | "negation";
    allowedPropertyTypes: PropertyTypes[]
}

export type PropertyTypes = "string" | "int" | "number" | "date-time" | "date";

export class CQL {

    tokens: PatternName[] = [
        'PROPERTY', 'COMPARISON', 'VALUE', 'LOGICAL'
    ];

    patterns: PatternsObject = {
        INCLUDE: /^INCLUDE$/,
        PROPERTY: /^"?[_a-zA-Z"]\w*"?/,
        COMPARISON: /^(=|<>|<=|<|>=|>|LIKE)/i,
        IS_NULL: /^IS NULL/i,
        COMMA: /^,/,
        LOGICAL: /^(AND|OR)/i,
        VALUE: /^('([^']|'')*'|-?\d+(\.\d*)?|\.\d+)/,
        LPAREN: /^\(/,
        RPAREN: /^\)/,
        SPATIAL: /^(BBOX|INTERSECTS|DWITHIN|WITHIN|CONTAINS)/i,
        NOT: /^NOT/i,
        BETWEEN: /^BETWEEN/i,
        GEOMETRY: (text:string) => {
            const type = /^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)/.exec(text);
            if (type) {
                const len = text.length;
                let idx = text.indexOf("(", type[0].length);
                if (idx > -1) {
                    let depth = 1;
                    while (idx < len && depth > 0) {
                        idx++;
                        switch (text.charAt(idx)) {
                            case '(':
                                depth++;
                                break;
                            case ')':
                                depth--;
                                break;
                            default:
                            // in default case, do nothing
                        }
                    }
                }
                return [text.substring(0, idx + 1)];
            }
            return null;
        },
        END: /^$/
    };

    follows: FollowsObject = {
        INCLUDE: ['END'],
        LPAREN: ['GEOMETRY', 'SPATIAL', 'PROPERTY', 'VALUE', 'LPAREN'],
        RPAREN: ['NOT', 'LOGICAL', 'END', 'RPAREN'],
        PROPERTY: ['COMPARISON', 'BETWEEN', 'COMMA', 'IS_NULL'],
        BETWEEN: ['VALUE'],
        IS_NULL: ['END'],
        COMPARISON: ['VALUE'],
        COMMA: ['GEOMETRY', 'VALUE', 'PROPERTY'],
        VALUE: ['LOGICAL', 'COMMA', 'RPAREN', 'END'],
        SPATIAL: ['LPAREN'],
        LOGICAL: ['NOT', 'VALUE', 'SPATIAL', 'PROPERTY', 'LPAREN'],
        NOT: ['PROPERTY', 'LPAREN'],
        GEOMETRY: ['COMMA', 'RPAREN']
    };

    operatorsMap: OperatorsMap = {
        '=': '==',
        '<>': '!=',
        '<': '<',
        '<=': '<=',
        '>': '>',
        '>=': '>=',
        'LIKE': '*=',
        'BETWEEN': '<=x<='
    };

    operators: Operators = {
        '=': olFilter.equalTo,
        '<>': olFilter.notEqualTo,
        '<': olFilter.lessThan,
        '<=': olFilter.lessThanOrEqualTo,
        '>': olFilter.greaterThan,
        '>=': olFilter.greaterThanOrEqualTo,
        'LIKE': olFilter.like,
        'BETWEEN': olFilter.between,
        'IS NULL': olFilter.isNull
    }

    operatorReverseMap: OperatorsReverseMap = {};

    combinationOperatorsMap: CombinationOperatorsMap = {
        'AND': '&&',
        'OR': '||'
    };

    combinationOperatorsReverseMap: CombinationOperatorsReverseMap = {};

    precedence: PrecedenceMap = {
        'RPAREN': 3,
        'LOGICAL': 2,
        'COMPARISON': 1
    };

    filterTypes: FilterType[] = [
        {
            tagName: 'PropertyIsEqualTo',
            cqlTag: '=',
            friendlyName: 'equals',
            description: 'Can be used to compare equality for two numbers, two strings, two dates, and so on',
            type: "singleValue",
            allowedPropertyTypes: ["string", "int", "date-time", "date", "number"]
        },
        {
            tagName: 'PropertyIsNotEqualTo',
            cqlTag: '<>',
            friendlyName: 'not equal to',
            description: '',
            type: "singleValue",
            allowedPropertyTypes: ["string", "int", "date-time", "date", "number"]
        },
        {
            tagName: 'PropertyIsGreaterThan',
            cqlTag: '>',
            friendlyName: 'greater than',
            description: '',
            type: "singleValue",
            allowedPropertyTypes: ["int", "date-time", "date", "number"]
        },
        {
            tagName: 'PropertyIsGreaterThanOrEqualTo',
            cqlTag: '>=',
            friendlyName: 'greater than or equal to',
            description: '',
            type: "singleValue",
            allowedPropertyTypes: ["int", "date-time", "date", "number"]
        },
        {
            tagName: 'PropertyIsLessThan',
            cqlTag: '<',
            friendlyName: 'less than',
            description: '',
            type: "singleValue",
            allowedPropertyTypes: ["int", "date-time", "date", "number"]
        },
        {
            tagName: 'PropertyIsLessThanOrEqualTo',
            cqlTag: '<=',
            friendlyName: 'less than or equal to',
            description: '',
            type: "singleValue",
            allowedPropertyTypes: ["int", "date-time", "date", "number"]
        },
        {
            tagName: 'PropertyIsLike',
            cqlTag: 'LIKE',
            friendlyName: 'like',
            description: '',
            type: "singleValue",
            allowedPropertyTypes: ["string"]
        },
        {
            tagName: 'PropertyIsBetween',
            cqlTag: 'BETWEEN',
            friendlyName: 'between',
            description: 'Comparison operator to test whether an expression value lies within a range given by a lower and upper bound (inclusive)',
            type: "twoValue",
            allowedPropertyTypes: ["int", "date-time", "date", "number"]
        },
        {
            tagName: 'PropertyIsNull',
            cqlTag: 'IS NULL',
            friendlyName: 'is null',
            description: 'Checks to see if the property has a null value (no value at all)',
            type: "nullValue",
            allowedPropertyTypes: ["string", "int", "date-time", "date", "number"]
        },
        {
            tagName: 'And',
            cqlTag: 'AND',
            friendlyName: 'all',
            description: '',
            type: "logical",
            allowedPropertyTypes: []
        },
        {
            tagName: 'Or',
            cqlTag: 'OR',
            friendlyName: 'any',
            description: '',
            type: "logical",
            allowedPropertyTypes: []
        },
        {
            tagName: 'Not',
            cqlTag: 'NOT',
            friendlyName: 'none',
            description: '',
            type: 'negation',
            allowedPropertyTypes: []
        }
    ]

    constructor() {
        const {
            combinationOperatorsMap,
            combinationOperatorsReverseMap,
            operatorsMap,
            operatorReverseMap
        } = this;

        Object.keys(operatorsMap)
            .forEach((operator: CqlOperator) => {
                const value = operatorsMap[operator];
                operatorReverseMap[value] = operator;
            });

        Object.keys(combinationOperatorsMap)
            .forEach((combinationOperator: 'AND' | 'OR') => {
                const value: CombinationOperator = combinationOperatorsMap[combinationOperator];
                combinationOperatorsReverseMap[value] = combinationOperator;
            });

        this.nextToken = this.nextToken.bind(this);
        this.tokenize = this.tokenize.bind(this);
        this.tryToken = this.tryToken.bind(this);
        this.buildAst = this.buildAst.bind(this);
        this.read = this.read.bind(this);
        this.write = this.write.bind(this);
    }

    tryToken(text: any, pattern: Pattern) {
        if (pattern instanceof RegExp) {
            return pattern.exec(text);
        } else if (pattern) {
            return pattern(text);
        }
    }

    nextToken(text: any, patternNames: PatternName[]): Token {
        const {
            patterns,
            tryToken
        } = this;
        let i;
        let token;
        const len = patternNames.length;
        for (i = 0; i < len; i++) {
            token = patternNames[i];
            const pattern = patterns[token];
            const matches = tryToken(text, pattern);
            if (matches) {
                const match = matches[0];
                const remainder = text.substr(match.length).replace(/^\s*/, '');
                return {
                    type: token,
                    text: match,
                    remainder: remainder
                };
            }
        }

        let msg = `ERROR: In parsing: [${text}], expected one of: `;
        for (i = 0; i < len; i++) {
            token = patternNames[i];
            msg += `\n    ${token}: ${patterns[token]}`;
        }

        throw new Error(msg);
    }

    tokenize(text: string): Token[] {
        const {
            nextToken,
            follows
        } = this;
        const results = [];
        let expect: PatternName[] = ['NOT', 'PROPERTY', 'LPAREN'];
        let token: Token;

        do {
            token = nextToken(text, expect);
            text = token.remainder;
            expect = follows[token.type];
            if (token.type !== 'END' && !expect) {
                throw new Error(`No follows list for ${token.type}`);
            }
            results.push(token);
        } while (token.type !== 'END');

        return results;
    }

    buildAst(tokens: Token[]) {
        const {
            precedence
        } = this;
        const operatorStack: any[] = [];
        const postfix: Token[] = [];

        tokens.forEach(token => {
            switch (token.type) {
                case 'PROPERTY':
                case 'GEOMETRY':
                case 'VALUE':
                    postfix.push(token);
                    break;
                case 'COMPARISON':
                case 'BETWEEN':
                case 'IS_NULL':
                case 'LOGICAL':
                    {
                        const p = precedence[token.type];
                        while (operatorStack.length > 0 &&
                            (precedence[operatorStack[operatorStack.length - 1].type] <= p)
                        ) {
                            postfix.push(operatorStack.pop());
                        }
                        operatorStack.push(token);
                        break;
                    }
                case 'SPATIAL':
                case 'NOT':
                case 'LPAREN':
                    operatorStack.push(token);
                    break;
                case 'RPAREN':
                    while (operatorStack.length > 0 &&
                        (operatorStack[operatorStack.length - 1].type !== 'LPAREN')
                    ) {
                        postfix.push(operatorStack.pop());
                    }
                    operatorStack.pop(); // toss out the LPAREN

                    if (operatorStack.length > 0 &&
                        operatorStack[operatorStack.length - 1].type === 'SPATIAL') {
                        postfix.push(operatorStack.pop());
                    }
                    break;
                case 'COMMA':
                case 'END':
                    break;
                default:
                    throw new Error(`Unknown token type ${  token.type}`);
            }
        });

        while (operatorStack.length > 0) {
            postfix.push(operatorStack.pop());
        }

        const buildTree = (): any => {
            const token = postfix.pop();
            if (token) {
                switch (token.type) {
                    case 'LOGICAL':
                        {
                            const rhs = buildTree(),
                                lhs = buildTree();

                            //TODO - Make this pretty
                            //if one of the sides of this argument is itself an and, that's a problem
                            let lhsFilters: Filter[];
                            if (lhs instanceof And || lhs instanceof Or) {
                                //spread it!
                                lhsFilters = lhs.conditions;
                            } else {
                                lhsFilters = [lhs];
                            }

                            let rhsFilters: Filter[];
                            if (rhs instanceof And || rhs instanceof Or) {
                                //spread it!
                                rhsFilters = rhs.conditions;
                            } else {
                                rhsFilters = [rhs];
                            }
                            if (token.text.toUpperCase() === 'AND') {


                                return olFilter.and(...lhsFilters, ...rhsFilters);
                            } else {
                                return olFilter.or(...lhsFilters, ...rhsFilters);
                            }
                        }
                    case 'NOT':
                        {
                            const operand = buildTree();
                            return olFilter.not(operand);
                        }
                    case 'BETWEEN':
                        {
                            postfix.pop(); // unneeded AND token here
                            const max = buildTree();
                            const min = buildTree();
                            const property = buildTree();
                            return olFilter.between(property, min, max);
                        }
                    case 'COMPARISON':
                        {
                            const value = buildTree();
                            const property = buildTree();
                            const operator = this.operators[token.text.toUpperCase()];
                            return operator(property, value)
                        }
                    case 'IS_NULL':
                        {
                            const property = buildTree();
                            return olFilter.isNull(property);
                        }
                    case 'VALUE':
                        {
                            const num = parseFloat(token.text);
                            if (isNaN(num)) {
                                return token.text.replace(/['"]/g, '');
                            } else {
                                return num;
                            }
                        }
                    case "SPATIAL":
                        {
                            switch (token.text.toUpperCase()) {
                                case "BBOX":
                                    {
                                        const maxy = buildTree(),
                                            maxx = buildTree(),
                                            miny = buildTree(),
                                            minx = buildTree(),
                                            prop = buildTree();
                                        return olFilter.bbox(prop, [minx, miny, maxx, maxy]);
                                    }
                                case "INTERSECTS":
                                    {
                                        const value = buildTree(),
                                            property = buildTree();

                                        return olFilter.intersects(property, value);
                                    }
                                case "WITHIN":
                                    {
                                        const value = buildTree(),
                                            property = buildTree();

                                        return olFilter.within(property, value);
                                    }
                                case "CONTAINS":
                                    {
                                        const value = buildTree(),
                                            property = buildTree();

                                        return olFilter.contains(property, value);
                                    }
                                case "DWITHIN":
                                    {
                                        const distance = buildTree(),
                                            value = buildTree(),
                                            property = buildTree();
                                        //assumption of metres is not ideal
                                        return olFilter.dwithin(property, value, distance, "m");
                                    }
                            }
                            break;
                        }
                    case "GEOMETRY":
                        {
                            const wktReader = new WKT();
                            return wktReader.readFeature(token.text);
                        }
                    default:
                        return token.text;
                }
            }
            return;
        };

        const result = buildTree();
        if (postfix.length > 0) {
            let msg = 'Remaining tokens after building AST: \n';
            for (let i = postfix.length - 1; i >= 0; i--) {
                msg += `${postfix[i].type  }: ${  postfix[i].text  }\n`;
            }
            throw new Error(msg);
        }

        return result;
    }

    read(text: string | undefined): Filter | undefined {
        const {
            buildAst,
            tokenize
        } = this;

        if (!text || text.length === 0) {
            return undefined;
        }

        const tokenizedText = tokenize(text);
        return buildAst(tokenizedText);
    }

    write(filter: Filter | undefined): string | undefined {

        const filterTagName = filter.getTagName();
        const filterType = this.filterTypes.find(f => f.tagName === filterTagName);

        const operator = filterType.cqlTag;

        switch (filterType.type) {
            case "singleValue":
                {
                    let value = (filter as EqualTo).expression;
                    const propName = (filter as EqualTo).propertyName;
                    if (filterType.tagName === "PropertyIsLike") {
                        value = CQL.convertOLWildcardPatternToCQLPattern((filter as IsLike).pattern);
                    }
                    if (typeof value === 'string') {
                        value = `'${value}'`;
                    }
                    return `${propName} ${operator} ${value}`
                }
            case "twoValue":
                {
                    //for dates we need to add '' around the value, but OL assumed the lowerBoundary
                    //will be a number, so we do some type checking coercian
                    const lowerBoundary = (filter as IsBetween).lowerBoundary;
                    let coercedLowerBoundary: string | number = lowerBoundary;
                    if (typeof lowerBoundary === 'string') {
                        coercedLowerBoundary = `'${lowerBoundary}'`;
                    }
                    const upperBoundary = (filter as IsBetween).upperBoundary;
                    let coercedUpperBoundary: string | number = upperBoundary;
                    if (typeof upperBoundary === 'string') {
                        coercedUpperBoundary = `'${upperBoundary}'`;
                    }

                    const propName = (filter as IsBetween).propertyName;
                    return `${propName} ${operator} ${coercedLowerBoundary} AND ${coercedUpperBoundary}`;
                }
            case "nullValue":
                {
                    const propName = (filter as IsNull).propertyName;
                    return `${propName} ${operator}`;
                }
            case "negation":
                return `NOT(${this.write((filter as Not).condition)})`;
            case "logical":
                {
                    let cql: string = `(`;
                    let first = true;
                    (filter as And).conditions.forEach(condition => {
                        if (!first) {
                            cql += ` ${operator} `;
                        }
                        cql += this.write(condition);
                        first = false
                    })
                    cql += `)`;
                    return cql;
                }
        }



        //switch (operator) {
        //    case '!':
        //        // TODO this should be better typed, get rid of `as any`
        //        return `NOT ( ${write(filter[1] as any)} )`;
        //    case '&&':
        //    case '||':
        //        let cqlFilter: string = '';
        //        const cqlCombinationOperator = combinationOperatorsReverseMap[operator];
        //        cqlFilter += filter
        //            .slice(1)
        //            // TODO this should be better typed, get rid of `f: any`
        //            .map((f: any) => write(f, true))
        //            .join(` ${cqlCombinationOperator} `);
        //        if (isChild) {
        //            return `(${cqlFilter})`;
        //        } else {
        //            return cqlFilter;
        //        }
        //    case '==':
        //    case '*=':
        //    case '!=':
        //    case '<':
        //    case '<=':
        //    case '>':
        //    case '>=':
        //        const valueIsString = (typeof filter[2] === 'string');
        //        let value = filter[2];
        //        if (valueIsString) {
        //            value = `'${value}'`;
        //        }
        //        return `${filter[1]} ${cqlOperator} ${value}`;
        //    case '<=x<=':
        //        return `${filter[1]} ${cqlOperator} ${filter[2]} AND ${filter[3]}`;
        //    case undefined:
        //        break;
        //    default:
        //        throw new Error(`Can't encode: ${filter}`);
        //}
        //return;
    }
    public static convertCQLWildcardPatternToOLPattern(pattern: string): string {

        /*Ideal implemntation using regex negative lookbehind
         * At time of writing this is not supported in Safari
         * https://caniuse.com/js-regexp-lookbehind */
        //return pattern.replaceAll(/(?<!\!)_/g, '.')
        //              .replaceAll(/(?<!\!)%/g, "*");

        /*Slightly more cumbersome implementation */
        let convertedPattern = pattern;
        const underscores = [...pattern.matchAll(/_/g)];
        for (const underscore of underscores) {
            //find the character before. If its the escape character, do NOT change this
            if (underscore.index === 0 || convertedPattern.charAt(underscore.index - 1) !== "!") {
                //replace me!
                convertedPattern = `${convertedPattern.substring(0, underscore.index)  }.${  convertedPattern.substring(underscore.index + 1)}`
            }
        }
        const percentages = [...pattern.matchAll(/%/g)];
        for (const percentage of percentages) {
            //find the character before. If its the escape character, do NOT change this
            if (percentage.index === 0 || convertedPattern.charAt(percentage.index - 1) !== "!") {
                //replace me!
                convertedPattern = `${convertedPattern.substring(0, percentage.index)  }*${  convertedPattern.substring(percentage.index + 1)}`
            }
        }
        return convertedPattern;
    }

    public static convertOLWildcardPatternToCQLPattern(pattern: string): string {

        /*Ideal implemntation using regex negative lookbehind
         * At time of writing this is not supported in Safari
         * https://caniuse.com/js-regexp-lookbehind */
        //return pattern.replaceAll(/(?<!\!)_/g, '.')
        //              .replaceAll(/(?<!\!)%/g, "*");

        /*Slightly more cumbersome implementation */
        let convertedPattern = pattern;
        const periods = [...pattern.matchAll(/\./g)];
        for (const period of periods) {
            //find the character before. If its the escape character, do NOT change this
            if (period.index === 0 || convertedPattern.charAt(period.index - 1) !== "!") {
                //replace me!
                convertedPattern = `${convertedPattern.substring(0, period.index)  }_${  convertedPattern.substring(period.index + 1)}`
            }
        }
        const asterisks = [...pattern.matchAll(/\*/g)];
        for (const asterisk of asterisks) {
            //find the character before. If its the escape character, do NOT change this
            if (asterisk.index === 0 || convertedPattern.charAt(asterisk.index - 1) !== "!") {
                //replace me!
                convertedPattern = `${convertedPattern.substring(0, asterisk.index)  }%${  convertedPattern.substring(asterisk.index + 1)}`
            }
        }
        return convertedPattern;
    }
}

export default CQL;
