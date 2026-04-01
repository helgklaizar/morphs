import json
from unittest.mock import patch
from mlx_agent import CoreMind

@patch("mlx_agent.load")
@patch("mlx_agent.generate")
def test_think_structured_xml_parsing(mock_generate, mock_load):
    # Mocking Llama loading
    mock_load.return_value = ("mock_model", "mock_tokenizer")
    
    # Mocking Llama completion (Returns clean XML like o1 does)
    mock_generate.return_value = (
        "My thought: I should use FastAPI.</thought>\n"
        "<code>\nfrom fastapi import FastAPI\napp = FastAPI()\n</code><|eot_id|>"
    )
    
    mind = CoreMind(model_name="test_model_path_none")
    result = mind.think_structured("Write a FastAPI app", schema_description="none")
    
    assert "thought" in result
    assert "My thought: I should use FastAPI." in result["thought"]
    
    assert "code" in result
    assert "from fastapi import FastAPI" in result["code"]
    assert "component_code" in result # Check for fallback duplication
    assert result["component_code"] == result["code"]

@patch("mlx_agent.load")
@patch("mlx_agent.generate")
def test_atropos_rl_injection(mock_generate, mock_load):
    """
    Tests that AtroposMemory (LanceDB) experience
    is successfully injected into the LLM's system prompt
    """
    mock_load.return_value = ("mock_model", "mock_tokenizer")
    mock_generate.return_value = "Test</thought>\n<code>Test</code><|eot_id|>"
    
    with patch("core.atropos_memory.AtroposMemory") as MockMemory:
        mock_instance = MockMemory.return_value
        mock_instance.get_relevant_experience.return_value = "ERROR: Forgot HTTPBearer. PATCH: from fastapi.security import HTTPBearer..."
        
        mind = CoreMind(model_name="test")
        res = mind.think_structured("Prompt", "Schema")
        assert "Test" in res["thought"]
            
    call_kwargs = mock_generate.call_args[1]
    prompt_sent_to_llama = call_kwargs["prompt"]
    assert "Forgot HTTPBearer" in prompt_sent_to_llama
    assert "Bad variable" not in prompt_sent_to_llama
