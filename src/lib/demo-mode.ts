// Demo Mode - Mock responses for portfolio demonstrations
import { ModelResponse } from './model-adapters';

const DEMO_RESPONSES: Record<string, string[]> = {
  openai: [
    `Here's a comprehensive analysis of your query:

**Key Points:**
1. The approach you've outlined is well-structured and follows best practices
2. Consider implementing error boundaries for better resilience
3. Performance can be optimized using memoization techniques

**Implementation Strategy:**
\`\`\`typescript
// Example implementation
const optimizedSolution = useMemo(() => {
  return processData(input);
}, [input]);
\`\`\`

This approach ensures optimal performance while maintaining code readability. The trade-offs are minimal compared to the benefits gained.

**Recommendations:**
- Start with a minimal viable implementation
- Add comprehensive tests before scaling
- Monitor performance metrics in production`,

    `Based on my analysis, here are the key insights:

**Summary:**
Your question touches on a fundamental aspect of modern software development. Let me break this down systematically.

**Approach 1: Direct Implementation**
Pros: Fast to implement, easy to understand
Cons: May not scale well for large datasets

**Approach 2: Abstracted Pattern**
Pros: Highly scalable, maintainable
Cons: More initial complexity

I recommend starting with Approach 1 for rapid prototyping, then refactoring to Approach 2 as your needs grow.`,
  ],
  anthropic: [
    `I'll help you work through this systematically.

First, let me understand the core challenge: you're looking for a solution that balances performance with maintainability.

**My Analysis:**

The most elegant approach here involves separating concerns:

1. **Data Layer** - Handle all state management separately
2. **Presentation Layer** - Keep components focused on rendering
3. **Business Logic** - Extract into dedicated hooks or utilities

\`\`\`typescript
// Clean separation example
export function useBusinessLogic(config: Config) {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  const processedData = useMemo(() => 
    transformData(state.raw, config),
    [state.raw, config]
  );
  
  return { data: processedData, actions: dispatch };
}
\`\`\`

This pattern has served me well in similar scenarios. The key insight is that complexity should be *managed*, not eliminated—and proper architecture makes this manageable.`,

    `Let me think through this carefully.

**The Core Problem:**
You're essentially asking about optimization—but the right optimization depends heavily on your constraints.

**Key Considerations:**
- What's your expected data volume?
- How frequently does the data change?
- What are your latency requirements?

**Recommended Path Forward:**
1. Measure first—don't optimize prematurely
2. Identify the actual bottleneck
3. Apply targeted solutions

The most common mistake I see is over-engineering early. Start simple, measure, then optimize based on real data.`,
  ],
  gemini: [
    `Great question! Let me provide a detailed breakdown.

## Overview
This is a classic problem in software engineering with multiple valid solutions.

## Analysis

| Approach | Speed | Maintainability | Complexity |
|----------|-------|-----------------|------------|
| Method A | Fast  | Medium          | Low        |
| Method B | Medium| High            | Medium     |
| Method C | Slow  | Very High       | High       |

## My Recommendation

For your use case, I'd suggest **Method B** as it provides the best balance. Here's why:

1. **Scalability** - Handles growth without major refactoring
2. **Team Adoption** - Easy for other developers to understand
3. **Testing** - Straightforward to write comprehensive tests

## Implementation Notes

\`\`\`typescript
// Method B implementation
class OptimizedHandler {
  private cache = new Map();
  
  process(input: Input): Output {
    if (this.cache.has(input.id)) {
      return this.cache.get(input.id);
    }
    const result = this.compute(input);
    this.cache.set(input.id, result);
    return result;
  }
}
\`\`\`

Let me know if you'd like me to elaborate on any of these points!`,

    `Here's my analysis of your question:

**Quick Answer:** Yes, this is definitely achievable, and I'll show you how.

**Detailed Breakdown:**

The solution involves three key components:
1. Input validation and sanitization
2. Core processing logic
3. Output formatting and error handling

**Step-by-Step Implementation:**

\`\`\`typescript
// Step 1: Validate
const validated = schema.parse(input);

// Step 2: Process
const result = await processor.handle(validated);

// Step 3: Format
return formatter.toOutput(result);
\`\`\`

**Performance Considerations:**
- Average latency: ~50ms
- Memory footprint: Minimal
- Scalability: Linear with input size

This approach has been battle-tested in production environments handling millions of requests.`,
  ],
};

const MOCK_LATENCIES = {
  openai: { min: 800, max: 2000 },
  anthropic: { min: 1000, max: 2500 },
  gemini: { min: 600, max: 1800 },
};

const MOCK_TOKEN_COSTS = {
  openai: { promptCost: 0.00003, completionCost: 0.00006 },
  anthropic: { promptCost: 0.00003, completionCost: 0.00015 },
  gemini: { promptCost: 0.0000125, completionCost: 0.0000375 },
};

export function getDemoResponse(
  provider: string,
  model: string,
  promptTokens: number
): Promise<ModelResponse> {
  return new Promise((resolve, reject) => {
    const responses = DEMO_RESPONSES[provider] || DEMO_RESPONSES.openai;
    const response = responses[Math.floor(Math.random() * responses.length)];
    const latency = MOCK_LATENCIES[provider as keyof typeof MOCK_LATENCIES] || MOCK_LATENCIES.openai;
    const delay = latency.min + Math.random() * (latency.max - latency.min);

    // Simulate occasional errors (5% chance)
    if (Math.random() < 0.05) {
      setTimeout(() => {
        reject(new Error('Rate limit exceeded (mock error - retry available)'));
      }, delay * 0.3);
      return;
    }

    const completionTokens = Math.floor(response.length / 4);
    const costs = MOCK_TOKEN_COSTS[provider as keyof typeof MOCK_TOKEN_COSTS] || MOCK_TOKEN_COSTS.openai;
    const estimatedCost = (promptTokens * costs.promptCost) + (completionTokens * costs.completionCost);

    setTimeout(() => {
      resolve({
        content: response,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        provider,
        model,
        // Extra demo metadata
        isMock: true,
        latencyMs: Math.round(delay),
        estimatedCost: Math.round(estimatedCost * 10000) / 10000,
      } as ModelResponse & { isMock: boolean; latencyMs: number; estimatedCost: number });
    }, delay);
  });
}

export function isDemoModeEnabled(): boolean {
  try {
    const settings = localStorage.getItem('llmprism_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.demoMode === true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function setDemoMode(enabled: boolean): void {
  try {
    const settings = localStorage.getItem('llmprism_settings') || '{}';
    const parsed = JSON.parse(settings);
    parsed.demoMode = enabled;
    localStorage.setItem('llmprism_settings', JSON.stringify(parsed));
  } catch {
    // ignore
  }
}
