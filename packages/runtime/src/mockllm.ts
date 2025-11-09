// Deterministic "LLM" to keep tonight simple.
export async function mockLLM(role: string, input: string): Promise<string> {
    if (role === "Planner") {
      return `{"plan":["Define requirements","Choose services","Design data flow","Outline scaling","List risks"]}`;
    }
    if (role === "Worker") {
      // Produce a pseudo artifact from the latest instruction.
      return `Artifact: Drafted section for "${input.slice(0, 40)}..." with bullet points and a diagram stub.`;
    }
    if (role === "Critic") {
      // Score high after one pass to end run.
      const needsRevision = /TODO|stub/i.test(input);
      if (needsRevision) return `Score: 6/10. Improve specifics and remove TODOs.`;
      return `Score: 9/10. Looks solid. control:done`;
    }
    return `Echo(${role}): ${input}`;
  }
  