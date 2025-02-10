import React, { useCallback, useEffect, useRef, memo } from 'react';
import { 
    DefaultButton, 
    PrimaryButton, 
    Spinner, 
    MessageBar, 
    MessageBarType,
    VirtualizedList
} from '@fluentui/react'; // ^8.0.0
import { debounce } from 'lodash'; // ^4.17.21

import {
    Container,
    SuggestionItem,
    ActionButtons,
    FormulaText,
    ConfidenceScore
} from './SuggestionPanel.styles';
import { useFormula } from '../../../hooks/useFormula';
import { IFormulaSuggestion } from '../../../interfaces/formula.interface';

// Constants for performance optimization
const SUGGESTION_UPDATE_DEBOUNCE_MS = 150;
const MIN_CONFIDENCE_SCORE = 0.6;
const VIRTUALIZATION_OVERSCAN = 5;

interface SuggestionPanelProps {
    suggestions: IFormulaSuggestion[];
    isLoading: boolean;
    error: string | null;
}

/**
 * SuggestionPanel component displays AI-generated formula suggestions with
 * accessibility support and performance optimization
 */
export const SuggestionPanel = memo(({ 
    suggestions, 
    isLoading, 
    error 
}: SuggestionPanelProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const { handleSuggestionSelect, handleSuggestionExplain, retrySuggestions } = useFormula();

    // Debounced suggestion update handler
    const debouncedUpdateAnnouncement = useCallback(
        debounce((count: number) => {
            const announcement = `${count} formula suggestions available`;
            if (panelRef.current) {
                panelRef.current.setAttribute('aria-label', announcement);
            }
        }, SUGGESTION_UPDATE_DEBOUNCE_MS),
        []
    );

    // Update ARIA live region when suggestions change
    useEffect(() => {
        if (!isLoading && suggestions.length > 0) {
            debouncedUpdateAnnouncement(suggestions.length);
        }
        return () => {
            debouncedUpdateAnnouncement.cancel();
        };
    }, [suggestions, isLoading, debouncedUpdateAnnouncement]);

    // Render loading state
    if (isLoading) {
        return (
            <Container>
                <Spinner 
                    label="Generating formula suggestions..." 
                    ariaLabel="Generating formula suggestions"
                    role="status"
                    aria-live="polite"
                />
            </Container>
        );
    }

    // Render error state
    if (error) {
        return (
            <Container>
                <MessageBar
                    messageBarType={MessageBarType.error}
                    isMultiline={false}
                    dismissButtonAriaLabel="Close"
                    role="alert"
                >
                    {error}
                </MessageBar>
                <DefaultButton
                    onClick={retrySuggestions}
                    text="Retry"
                    aria-label="Retry generating suggestions"
                    styles={{ root: { marginTop: '8px' } }}
                />
            </Container>
        );
    }

    // Filter suggestions by minimum confidence score
    const validSuggestions = suggestions.filter(s => s.confidence >= MIN_CONFIDENCE_SCORE);

    // Render empty state
    if (validSuggestions.length === 0) {
        return (
            <Container>
                <MessageBar
                    messageBarType={MessageBarType.info}
                    role="status"
                >
                    No formula suggestions available. Try rephrasing your input.
                </MessageBar>
            </Container>
        );
    }

    // Render suggestion list
    return (
        <Container
            ref={panelRef}
            role="region"
            aria-label={`${validSuggestions.length} formula suggestions available`}
        >
            <VirtualizedList
                items={validSuggestions}
                overscanCount={VIRTUALIZATION_OVERSCAN}
                onRenderCell={(suggestion?: IFormulaSuggestion) => 
                    suggestion ? (
                        <SuggestionItemComponent 
                            key={suggestion.formula}
                            suggestion={suggestion}
                            onSelect={handleSuggestionSelect}
                            onExplain={handleSuggestionExplain}
                        />
                    ) : null
                }
                getItemHeight={() => 120} // Estimated height of each suggestion item
            />
        </Container>
    );
});

// Suggestion item sub-component
interface SuggestionItemProps {
    suggestion: IFormulaSuggestion;
    onSelect: (formula: string) => void;
    onExplain: (formula: string) => void;
}

const SuggestionItemComponent = memo(({
    suggestion,
    onSelect,
    onExplain
}: SuggestionItemProps) => {
    const itemRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(suggestion.formula);
        }
    }, [suggestion.formula, onSelect]);

    return (
        <SuggestionItem
            ref={itemRef}
            role="listitem"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            aria-label={`Formula suggestion with ${Math.round(suggestion.confidence * 100)}% confidence`}
        >
            <FormulaText aria-label="Formula">
                {suggestion.formula}
            </FormulaText>
            
            <ConfidenceScore 
                score={suggestion.confidence}
                aria-label={`Confidence score: ${Math.round(suggestion.confidence * 100)}%`}
            >
                {`${Math.round(suggestion.confidence * 100)}%`}
            </ConfidenceScore>
            
            <ActionButtons>
                <PrimaryButton
                    onClick={() => onSelect(suggestion.formula)}
                    text="Apply"
                    aria-label="Apply this formula"
                />
                <DefaultButton
                    onClick={() => onExplain(suggestion.formula)}
                    text="Explain"
                    aria-label="Get explanation for this formula"
                />
            </ActionButtons>
        </SuggestionItem>
    );
});

// Display names for debugging
SuggestionPanel.displayName = 'SuggestionPanel';
SuggestionItemComponent.displayName = 'SuggestionItem';

export default SuggestionPanel;