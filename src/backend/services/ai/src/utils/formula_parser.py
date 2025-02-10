"""
Excel Formula Parser Module

This module provides high-performance, thread-safe formula parsing capabilities with comprehensive
error detection and validation for the AI service. It supports AST generation, dependency analysis,
and formula structure interpretation to enable accurate formula suggestions and optimizations.

Version: 1.0.0
"""

import re
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, field
from ..constants import FORMULA_GENERATION, ERROR_CODES

@dataclass
class FormulaParser:
    """
    High-performance, thread-safe class for parsing Excel formulas into abstract syntax trees (AST)
    with comprehensive error detection and dependency analysis capabilities.
    """
    
    _function_pattern: re.Pattern = field(init=False)
    _operator_pattern: re.Pattern = field(init=False)
    _reference_pattern: re.Pattern = field(init=False)
    _dependency_map: Dict[str, List[str]] = field(default_factory=dict)
    
    def __post_init__(self) -> None:
        """Initialize regex patterns and internal state."""
        # Compile regex patterns for high-performance parsing
        self._function_pattern = re.compile(r'([A-Z]+)(?=\()', re.IGNORECASE)
        self._operator_pattern = re.compile(r'[\+\-\*/\^&=><]+')
        self._reference_pattern = re.compile(
            r'(?:\'?[A-Za-z0-9\s]+\'?!)?\$?[A-Z]+\$?\d+(?:\:\$?[A-Z]+\$?\d+)?',
            re.IGNORECASE
        )
        
        # Initialize performance monitoring
        self._parse_count = 0
        self._error_count = 0
        self._last_error = None

    def parse(self, formula: str) -> Dict[str, Any]:
        """
        Parse an Excel formula into an abstract syntax tree (AST) with comprehensive validation.
        
        Args:
            formula (str): The Excel formula to parse
            
        Returns:
            Dict[str, Any]: Validated AST representation with error details if applicable
            
        Raises:
            ValueError: If formula validation fails critically
        """
        if not formula or not isinstance(formula, str):
            return {
                'success': False,
                'error': ERROR_CODES['AI_003'],
                'details': 'Invalid formula input'
            }

        try:
            # Basic formula validation
            if not formula.startswith('='):
                formula = f'={formula}'
                
            if len(formula) > FORMULA_GENERATION['MAX_FORMULA_LENGTH']:
                return {
                    'success': False,
                    'error': ERROR_CODES['AI_002'],
                    'details': 'Formula exceeds maximum length'
                }

            # Tokenize formula
            tokens = self.tokenize(formula)
            if not tokens['success']:
                return tokens

            # Build and validate AST
            ast = self.build_ast(tokens['tokens'])
            if not ast['success']:
                return ast

            # Perform final validation
            validation_result = self._validate_ast(ast['tree'])
            if not validation_result['success']:
                return validation_result

            return {
                'success': True,
                'tree': ast['tree'],
                'complexity': self._calculate_complexity(ast['tree']),
                'validation': validation_result
            }

        except Exception as e:
            self._error_count += 1
            self._last_error = str(e)
            return {
                'success': False,
                'error': ERROR_CODES['AI_002'],
                'details': f'Parser error: {str(e)}'
            }

    def analyze_dependencies(self, formula: str, sheet_name: str) -> Dict[str, List[str]]:
        """
        Perform comprehensive formula dependency analysis including circular reference detection.
        
        Args:
            formula (str): The Excel formula to analyze
            sheet_name (str): The name of the current worksheet
            
        Returns:
            Dict[str, List[str]]: Comprehensive map of formula dependencies with validation status
        """
        dependencies = {
            'direct': [],
            'indirect': [],
            'circular': [],
            'cross_sheet': [],
            'validation': {'success': True, 'errors': []}
        }

        try:
            # Extract cell references
            references = self._reference_pattern.findall(formula)
            
            for ref in references:
                # Process cross-sheet references
                if '!' in ref:
                    sheet, cell = ref.split('!')
                    dependencies['cross_sheet'].append({
                        'sheet': sheet.strip("'"),
                        'reference': cell
                    })
                else:
                    dependencies['direct'].append(ref)

            # Check for circular references
            circular = self._detect_circular_references(
                formula, sheet_name, set(dependencies['direct'])
            )
            if circular:
                dependencies['circular'] = circular
                dependencies['validation']['success'] = False
                dependencies['validation']['errors'].append(
                    'Circular reference detected'
                )

            return dependencies

        except Exception as e:
            return {
                'direct': [],
                'indirect': [],
                'circular': [],
                'cross_sheet': [],
                'validation': {
                    'success': False,
                    'errors': [f'Dependency analysis failed: {str(e)}']
                }
            }

    def tokenize(self, formula: str) -> Dict[str, Any]:
        """
        Perform high-performance tokenization of formula components with error detection.
        
        Args:
            formula (str): The Excel formula to tokenize
            
        Returns:
            Dict[str, Any]: List of validated tokens with type and value
        """
        tokens = []
        current_pos = 1  # Skip initial '='
        formula_len = len(formula)
        
        try:
            while current_pos < formula_len:
                char = formula[current_pos]
                
                # Skip whitespace
                if char.isspace():
                    current_pos += 1
                    continue
                
                # Handle functions
                if char.isalpha():
                    match = self._function_pattern.match(formula[current_pos:])
                    if match:
                        func_name = match.group(0)
                        tokens.append({
                            'type': 'function',
                            'value': func_name,
                            'position': current_pos
                        })
                        current_pos += len(func_name)
                        continue
                
                # Handle cell references
                ref_match = self._reference_pattern.match(formula[current_pos:])
                if ref_match:
                    ref = ref_match.group(0)
                    tokens.append({
                        'type': 'reference',
                        'value': ref,
                        'position': current_pos
                    })
                    current_pos += len(ref)
                    continue
                
                # Handle operators
                op_match = self._operator_pattern.match(formula[current_pos:])
                if op_match:
                    operator = op_match.group(0)
                    tokens.append({
                        'type': 'operator',
                        'value': operator,
                        'position': current_pos
                    })
                    current_pos += len(operator)
                    continue
                
                # Handle parentheses and other special characters
                if char in '(),:':
                    tokens.append({
                        'type': 'delimiter',
                        'value': char,
                        'position': current_pos
                    })
                    current_pos += 1
                    continue
                
                # Handle numbers
                if char.isdigit() or char == '.':
                    num_start = current_pos
                    while (current_pos < formula_len and 
                           (formula[current_pos].isdigit() or formula[current_pos] == '.')):
                        current_pos += 1
                    tokens.append({
                        'type': 'number',
                        'value': formula[num_start:current_pos],
                        'position': num_start
                    })
                    continue
                
                # Handle string literals
                if char == '"':
                    str_start = current_pos
                    current_pos += 1
                    while current_pos < formula_len and formula[current_pos] != '"':
                        current_pos += 1
                    if current_pos < formula_len:
                        tokens.append({
                            'type': 'string',
                            'value': formula[str_start:current_pos + 1],
                            'position': str_start
                        })
                        current_pos += 1
                        continue
                
                # Unrecognized character
                return {
                    'success': False,
                    'error': ERROR_CODES['AI_002'],
                    'details': f'Unexpected character at position {current_pos}: {char}'
                }

            return {
                'success': True,
                'tokens': tokens
            }

        except Exception as e:
            return {
                'success': False,
                'error': ERROR_CODES['AI_002'],
                'details': f'Tokenization failed: {str(e)}'
            }

    def build_ast(self, tokens: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Construct and validate AST from tokenized formula with error checking.
        
        Args:
            tokens (List[Dict[str, str]]): List of tokens to build AST from
            
        Returns:
            Dict[str, Any]: Validated AST structure with error details
        """
        try:
            stack = []
            output = []
            operators = {
                '+': {'precedence': 1, 'associativity': 'left'},
                '-': {'precedence': 1, 'associativity': 'left'},
                '*': {'precedence': 2, 'associativity': 'left'},
                '/': {'precedence': 2, 'associativity': 'left'},
                '^': {'precedence': 3, 'associativity': 'right'},
                '&': {'precedence': 1, 'associativity': 'left'},
                '=': {'precedence': 0, 'associativity': 'left'},
                '>': {'precedence': 0, 'associativity': 'left'},
                '<': {'precedence': 0, 'associativity': 'left'},
            }

            for token in tokens:
                if token['type'] in ('number', 'string', 'reference'):
                    output.append({
                        'type': 'operand',
                        'value': token['value'],
                        'token_type': token['type']
                    })
                
                elif token['type'] == 'function':
                    stack.append({
                        'type': 'function',
                        'value': token['value'],
                        'arg_count': 0
                    })
                
                elif token['type'] == 'operator':
                    while (stack and stack[-1]['type'] == 'operator' and
                           ((operators[token['value']]['associativity'] == 'left' and
                             operators[token['value']]['precedence'] <= operators[stack[-1]['value']]['precedence']) or
                            (operators[token['value']]['associativity'] == 'right' and
                             operators[token['value']]['precedence'] < operators[stack[-1]['value']]['precedence']))):
                        output.append(stack.pop())
                    stack.append({
                        'type': 'operator',
                        'value': token['value']
                    })
                
                elif token['value'] == '(':
                    stack.append({'type': 'left_paren'})
                
                elif token['value'] == ')':
                    while stack and stack[-1]['type'] != 'left_paren':
                        output.append(stack.pop())
                    if not stack:
                        return {
                            'success': False,
                            'error': ERROR_CODES['AI_002'],
                            'details': 'Mismatched parentheses'
                        }
                    stack.pop()  # Remove left parenthesis
                    if stack and stack[-1]['type'] == 'function':
                        func = stack.pop()
                        output.append({
                            'type': 'function_call',
                            'value': func['value'],
                            'arg_count': func['arg_count'] + 1
                        })
                
                elif token['value'] == ',':
                    while stack and stack[-1]['type'] != 'left_paren':
                        output.append(stack.pop())
                    if not stack:
                        return {
                            'success': False,
                            'error': ERROR_CODES['AI_002'],
                            'details': 'Invalid formula structure'
                        }
                    if stack[-1]['type'] == 'function':
                        stack[-1]['arg_count'] += 1

            # Empty remaining stack
            while stack:
                if stack[-1]['type'] == 'left_paren':
                    return {
                        'success': False,
                        'error': ERROR_CODES['AI_002'],
                        'details': 'Mismatched parentheses'
                    }
                output.append(stack.pop())

            return {
                'success': True,
                'tree': self._build_tree(output)
            }

        except Exception as e:
            return {
                'success': False,
                'error': ERROR_CODES['AI_002'],
                'details': f'AST construction failed: {str(e)}'
            }

    def _build_tree(self, postfix: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Convert postfix notation to AST tree structure.
        
        Args:
            postfix (List[Dict[str, Any]]): Postfix notation tokens
            
        Returns:
            Dict[str, Any]: AST tree structure
        """
        stack = []
        
        for token in postfix:
            if token['type'] == 'operand':
                stack.append({
                    'type': token['token_type'],
                    'value': token['value']
                })
            elif token['type'] == 'operator':
                right = stack.pop()
                left = stack.pop()
                stack.append({
                    'type': 'operation',
                    'operator': token['value'],
                    'left': left,
                    'right': right
                })
            elif token['type'] == 'function_call':
                args = []
                for _ in range(token['arg_count']):
                    args.insert(0, stack.pop())
                stack.append({
                    'type': 'function',
                    'name': token['value'],
                    'arguments': args
                })
        
        return stack[0] if stack else None

    def _validate_ast(self, ast: Dict[str, Any]) -> Dict[str, bool]:
        """
        Perform comprehensive validation of the AST structure.
        
        Args:
            ast (Dict[str, Any]): AST to validate
            
        Returns:
            Dict[str, bool]: Validation result with details
        """
        if not ast:
            return {'success': False, 'error': 'Empty AST'}
        
        validation_result = {
            'success': True,
            'errors': [],
            'warnings': []
        }
        
        def validate_node(node):
            if not isinstance(node, dict):
                validation_result['success'] = False
                validation_result['errors'].append('Invalid node structure')
                return
            
            if 'type' not in node:
                validation_result['success'] = False
                validation_result['errors'].append('Node missing type')
                return
            
            if node['type'] == 'operation':
                if not all(k in node for k in ('operator', 'left', 'right')):
                    validation_result['success'] = False
                    validation_result['errors'].append('Invalid operation node structure')
                else:
                    validate_node(node['left'])
                    validate_node(node['right'])
            
            elif node['type'] == 'function':
                if not all(k in node for k in ('name', 'arguments')):
                    validation_result['success'] = False
                    validation_result['errors'].append('Invalid function node structure')
                else:
                    for arg in node['arguments']:
                        validate_node(arg)
        
        validate_node(ast)
        return validation_result

    def _detect_circular_references(self, formula: str, sheet_name: str, 
                                  current_refs: Set[str]) -> List[str]:
        """
        Detect circular references in formula dependencies.
        
        Args:
            formula (str): Current formula
            sheet_name (str): Current sheet name
            current_refs (Set[str]): Set of current references
            
        Returns:
            List[str]: List of detected circular references
        """
        circular_refs = []
        visited = set()
        
        def check_circular(ref: str, path: Set[str]) -> None:
            if ref in path:
                circular_refs.append('->'.join(path) + '->' + ref)
                return
            
            if ref in visited:
                return
                
            visited.add(ref)
            new_path = path | {ref}
            
            if ref in self._dependency_map:
                for dep in self._dependency_map[ref]:
                    check_circular(dep, new_path)
        
        for ref in current_refs:
            check_circular(ref, set())
            
        return circular_refs

    def _calculate_complexity(self, ast: Dict[str, Any]) -> Dict[str, int]:
        """
        Calculate formula complexity metrics.
        
        Args:
            ast (Dict[str, Any]): AST to analyze
            
        Returns:
            Dict[str, int]: Complexity metrics
        """
        metrics = {
            'depth': 0,
            'operations': 0,
            'functions': 0,
            'references': 0
        }
        
        def analyze_node(node, depth):
            metrics['depth'] = max(metrics['depth'], depth)
            
            if node['type'] == 'operation':
                metrics['operations'] += 1
                analyze_node(node['left'], depth + 1)
                analyze_node(node['right'], depth + 1)
            elif node['type'] == 'function':
                metrics['functions'] += 1
                for arg in node['arguments']:
                    analyze_node(arg, depth + 1)
            elif node['type'] == 'reference':
                metrics['references'] += 1
        
        analyze_node(ast, 1)
        return metrics