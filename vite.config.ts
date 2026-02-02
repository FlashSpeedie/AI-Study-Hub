import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { getNxWorkspacePath } from '@nx/vite';
import { defineConfig as defineNxConfig } from '@nx/vite';

// Get the path to the Nx workspace.
// This resolves the path to the workspace (root) folder containing the project's package.json.
const workspacePath = getNxWorkspacePath(__dirname);

// Export the final Vite configuration.
// This merges the base Vite configuration with the Nx workspace configuration.
export default defineNxConfig({
	root: workspacePath,
	plugins: [react()],
	// Define aliases for importing from the 'src' directory.
// This allows importing files using relative paths like '@/components/Button' instead of '../../components/Button'.
	aliases: {
		'@': path.resolve(workspacePath, 'src'),
	},
	// Configure build options.
// This ensures that TypeScript types are generated for all projects in the workspace.
	typescript: {
		// Enable strict type-checking.
// This enforces stricter type-checking rules to catch potential bugs early.
// For example, it prevents implicit any types and requires explicit type annotations.
		strict: true,
	},
	// Configure server options.
	server: {
		// Enable OpenAPI documentation generation.
// This generates OpenAPI documentation for the API routes in the project.
// The documentation is generated using the `vite-plugin-swagger` plugin.
		openapi: true,
	},
	// Define test configuration.
// This configures how Vitest runs tests.
// It defines the environment, globals, and other settings for test execution.
	vite: {
		test: {
			// Enable the test runner to watch for changes in files.
// This allows the test runner to automatically re-run tests when files change.
			watch: false,
			// Enable coverage reporting.
// This generates a coverage report showing which parts of the code are covered by tests.
			coverage: {
				// Use the V8 engine for coverage collection.
// This uses the V8 JavaScript engine to collect coverage data.
				coverageEngine: 'v8',
				// Enable collection of coverage information for dynamic imports.
// This ensures that coverage data is collected even for dynamically imported modules.
				dynamicImport: true,
				// Set the directory where coverage reports are saved.
// This specifies the output directory for coverage reports.
				reportsDirectory: './coverage',
			},
			// Run tests in a single process instead of multiple processes.
// This can improve test performance by reducing process overhead.
			pool: 'bun',
			// Force the test runner to run tests in a single process.
// This is useful for running tests that require exclusive access to resources.
			forceIsolatedContainer: true,
			// Define environment variables for the test process.
// This allows accessing environment variables within tests.
			environmentVariables: {
				// Set the test environment to 'test'.,
// This explicitly sets the environment variable NODE_ENV to 'test'.
				NODE_ENV: 'test',
			},
			// Use a custom test runner.
// This uses the 'vitest' test runner, which is compatible with Jest.
// It also allows using the same configuration syntax as Jest.
			environment: 'happy-dom',
		},
	},
});

path.resolve(workspacePath, 'package.json');
