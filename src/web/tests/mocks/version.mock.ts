/**
 * @file Version control mock implementations for testing
 * @description Provides comprehensive test doubles for version history, change tracking,
 * and version management operations with realistic behavior simulation
 * @version 1.0.0
 */

import {
    Version,
    VersionId,
    VersionChangeType,
    VersionMetadata,
    VersionChange,
    VersionResponse
} from '../../src/types/version.types';
import {
    IVersionService,
    IVersionCompareResult
} from '../../src/interfaces/version.interface';
import { v4 as uuidv4 } from 'uuid'; // @types/uuid ^9.0.0

// Constants for mock behavior configuration
const MOCK_DELAY_MS = 500;
const MOCK_ERROR_RATE = 0.1;
const MOCK_VERSION_LIMIT = 100;

/**
 * Creates a realistic mock version with complete metadata and changes
 */
export const createMockVersion = (
    changeType: VersionChangeType,
    description: string,
    parentVersion: Version | null
): Version => {
    const timestamp = new Date();
    const versionNumber = parentVersion 
        ? incrementVersionNumber(parentVersion.number)
        : '1.0.0';

    const metadata: VersionMetadata = {
        timestamp,
        author: 'Test User',
        description,
        changeType,
        workbookId: 'mock-workbook-id',
        worksheetId: 'mock-worksheet-id'
    };

    const changes: VersionChange[] = generateMockChanges(changeType);

    return {
        id: uuidv4(),
        number: versionNumber,
        metadata,
        changes,
        parentVersionId: parentVersion?.id || null
    };
};

/**
 * Creates a mock version response with configurable success/error states
 */
export const createMockVersionResponse = (
    success: boolean,
    version: Version | null,
    error: string | null = null
): VersionResponse => {
    return {
        success,
        version,
        error,
        timestamp: new Date()
    };
};

/**
 * Simulates realistic network delays for async operations
 */
export const simulateNetworkDelay = async (): Promise<void> => {
    const delay = Math.random() * MOCK_DELAY_MS;
    return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Enhanced mock implementation of IVersionService with realistic behavior
 */
export class MockVersionService implements IVersionService {
    private mockVersionHistory: Version[] = [];
    private currentVersion: Version | null = null;
    private errorSimulation: boolean;
    private networkDelay: boolean;

    constructor(errorSimulation = false, networkDelay = true) {
        this.errorSimulation = errorSimulation;
        this.networkDelay = networkDelay;
        this.initializeMockHistory();
    }

    /**
     * Retrieves mock version history with optional filtering and sorting
     */
    async getVersionHistory(limit?: number): Promise<Version[]> {
        if (this.networkDelay) {
            await simulateNetworkDelay();
        }

        if (this.shouldSimulateError()) {
            throw new Error('Failed to retrieve version history');
        }

        const history = [...this.mockVersionHistory];
        return limit ? history.slice(0, limit) : history;
    }

    /**
     * Creates a new mock version with realistic validation
     */
    async createVersion(
        changes: VersionChange[],
        changeType: VersionChangeType,
        description: string
    ): Promise<VersionResponse> {
        if (this.networkDelay) {
            await simulateNetworkDelay();
        }

        if (this.shouldSimulateError()) {
            return createMockVersionResponse(false, null, 'Failed to create version');
        }

        if (this.mockVersionHistory.length >= MOCK_VERSION_LIMIT) {
            return createMockVersionResponse(
                false,
                null,
                `Version limit of ${MOCK_VERSION_LIMIT} reached`
            );
        }

        const newVersion = createMockVersion(
            changeType,
            description,
            this.currentVersion
        );

        this.mockVersionHistory.push(newVersion);
        this.currentVersion = newVersion;

        return createMockVersionResponse(true, newVersion);
    }

    /**
     * Simulates version restoration with proper validation
     */
    async restoreVersion(versionId: VersionId): Promise<VersionResponse> {
        if (this.networkDelay) {
            await simulateNetworkDelay();
        }

        if (this.shouldSimulateError()) {
            return createMockVersionResponse(false, null, 'Failed to restore version');
        }

        const version = this.mockVersionHistory.find(v => v.id === versionId);
        if (!version) {
            return createMockVersionResponse(false, null, 'Version not found');
        }

        this.currentVersion = version;
        return createMockVersionResponse(true, version);
    }

    /**
     * Generates detailed mock version comparison results
     */
    async compareVersions(
        fromVersionId: VersionId,
        toVersionId: VersionId
    ): Promise<IVersionCompareResult> {
        if (this.networkDelay) {
            await simulateNetworkDelay();
        }

        if (this.shouldSimulateError()) {
            throw new Error('Failed to compare versions');
        }

        const fromVersion = this.mockVersionHistory.find(v => v.id === fromVersionId);
        const toVersion = this.mockVersionHistory.find(v => v.id === toVersionId);

        if (!fromVersion || !toVersion) {
            throw new Error('One or both versions not found');
        }

        return {
            fromVersion,
            toVersion,
            differences: generateVersionDifferences(fromVersion, toVersion),
            summary: generateComparisonSummary(fromVersion, toVersion)
        };
    }

    // Private helper methods
    private initializeMockHistory(): void {
        const initialVersion = createMockVersion(
            VersionChangeType.FORMULA_UPDATE,
            'Initial version',
            null
        );
        this.mockVersionHistory.push(initialVersion);
        this.currentVersion = initialVersion;
    }

    private shouldSimulateError(): boolean {
        return this.errorSimulation && Math.random() < MOCK_ERROR_RATE;
    }
}

// Helper functions
function incrementVersionNumber(version: string): string {
    const [major, minor, patch] = version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
}

function generateMockChanges(changeType: VersionChangeType): VersionChange[] {
    const changes: VersionChange[] = [];
    const numChanges = Math.floor(Math.random() * 5) + 1;

    for (let i = 0; i < numChanges; i++) {
        changes.push({
            cellReference: `${String.fromCharCode(65 + i)}${i + 1}`,
            previousValue: 'old value',
            newValue: 'new value',
            changeType,
            timestamp: new Date(),
            formula: changeType === VersionChangeType.FORMULA_UPDATE
                ? '=SUM(A1:A10)'
                : null
        });
    }

    return changes;
}

function generateVersionDifferences(
    fromVersion: Version,
    toVersion: Version
): VersionChange[] {
    return toVersion.changes.map(change => ({
        ...change,
        previousValue: 'old value',
        newValue: 'new value'
    }));
}

function generateComparisonSummary(
    fromVersion: Version,
    toVersion: Version
): string {
    return `Changes from version ${fromVersion.number} to ${toVersion.number}: ` +
           `${toVersion.changes.length} modifications`;
}