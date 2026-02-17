import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createServer } from '../src/server.js';

// Mock all tool registrations
vi.mock('../src/tools/index.js', () => ({
  registerTaskTools: vi.fn(),
  registerProjectTools: vi.fn(),
  registerContextTools: vi.fn(),
  registerKnowledgeTools: vi.fn(),
  registerVaultTools: vi.fn(),
  registerTechInfoTools: vi.fn(),
  registerGuidelineTools: vi.fn(),
}));

import {
  registerTaskTools,
  registerProjectTools,
  registerContextTools,
  registerKnowledgeTools,
  registerVaultTools,
  registerTechInfoTools,
  registerGuidelineTools,
} from '../src/tools/index.js';

describe('Server', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createServer', () => {
    it('should create a FastMCP server instance', () => {
      const server = createServer();
      expect(server).toBeDefined();
    });

    it('should register all 7 tool modules', () => {
      createServer();

      expect(registerTaskTools).toHaveBeenCalledTimes(1);
      expect(registerProjectTools).toHaveBeenCalledTimes(1);
      expect(registerContextTools).toHaveBeenCalledTimes(1);
      expect(registerKnowledgeTools).toHaveBeenCalledTimes(1);
      expect(registerVaultTools).toHaveBeenCalledTimes(1);
      expect(registerTechInfoTools).toHaveBeenCalledTimes(1);
      expect(registerGuidelineTools).toHaveBeenCalledTimes(1);
    });

    it('should pass the server instance to each registration function', () => {
      const server = createServer();

      expect(registerTaskTools).toHaveBeenCalledWith(server);
      expect(registerProjectTools).toHaveBeenCalledWith(server);
      expect(registerContextTools).toHaveBeenCalledWith(server);
      expect(registerKnowledgeTools).toHaveBeenCalledWith(server);
      expect(registerVaultTools).toHaveBeenCalledWith(server);
      expect(registerTechInfoTools).toHaveBeenCalledWith(server);
      expect(registerGuidelineTools).toHaveBeenCalledWith(server);
    });
  });
});
