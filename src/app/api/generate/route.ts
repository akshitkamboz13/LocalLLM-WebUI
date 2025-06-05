import { NextRequest, NextResponse } from 'next/server';
import { ollamaService } from '../../../../services/ollamaService';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    console.log('Request to Ollama:', body);
    
    if (!body.model || !body.prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: model and prompt' },
        { status: 400 }
      );
    }
    
    // Log the conversation history if available
    if (body.conversationHistory && body.conversationHistory.length > 0) {
      console.log(`Using conversation history with ${body.conversationHistory.length} messages`);
    }
    
    // Store the raw prompt for potential debugging
    const rawPrompt = body.rawPrompt || body.prompt;
    
    // Build the request body with all possible Ollama parameters
    const requestBody = {
      model: body.model,
      prompt: body.prompt,
      stream: false,
      system: body.system || undefined,
      template: body.template || undefined,
      context: body.context || undefined,
      format: body.format || undefined,
      raw: body.raw || undefined,
      images: body.images || undefined,
      options: {
        temperature: body.options?.temperature,
        top_p: body.options?.top_p,
        top_k: body.options?.top_k,
        num_predict: body.options?.num_predict,
        seed: body.options?.seed,
        num_ctx: body.options?.num_ctx,
        mirostat: body.options?.mirostat,
        mirostat_eta: body.options?.mirostat_eta,
        mirostat_tau: body.options?.mirostat_tau,
        repeat_penalty: body.options?.repeat_penalty,
        repeat_last_n: body.options?.repeat_last_n,
        frequency_penalty: body.options?.frequency_penalty,
        presence_penalty: body.options?.presence_penalty,
        tfs_z: body.options?.tfs_z,
        grammar: body.options?.grammar,
        num_gpu: body.options?.num_gpu,
        num_thread: body.options?.num_thread,
        stop: body.options?.stop,
        num_keep: body.options?.num_keep,
        numa: body.options?.numa,
        logit_bias: body.options?.logit_bias
      },
      keep_alive: body.keep_alive || undefined,
      suffix: body.suffix || undefined,
      think: body.think || undefined
    };
    
    const response = await ollamaService.generateCompletion(requestBody);
    console.log('Response from Ollama:', response);
    
    // Return both the original response and additional metadata
    return NextResponse.json({
      ...response,
      rawPrompt,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      totalTokens: (response.promptTokens || 0) + (response.completionTokens || 0),
      promptIncludedHistory: body.conversationHistory ? true : false
    });
  } catch (error) {
    console.error('Error in generate API:', error);
    // More detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to generate completion', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}