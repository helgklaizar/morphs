import json
from unittest.mock import patch
from mlx_agent import CoreMind

@patch("mlx_agent.load")
@patch("mlx_agent.generate")
def test_think_structured_xml_parsing(mock_generate, mock_load):
    # Мокаем Llama загрузку
    mock_load.return_value = ("mock_model", "mock_tokenizer")
    
    # Мокаем Llama завершение (Отдает чистый XML как это делает o1)
    mock_generate.return_value = (
        "Моя мысль: Я должен использовать FastAPI.</thought>\n"
        "<code>\nfrom fastapi import FastAPI\napp = FastAPI()\n</code><|eot_id|>"
    )
    
    mind = CoreMind(model_name="test_model_path_none")
    result = mind.think_structured("Напиши FastAPI", schema_description="none")
    
    assert "thought" in result
    assert "Моя мысль: Я должен использовать FastAPI." in result["thought"]
    
    assert "code" in result
    assert "from fastapi import FastAPI" in result["code"]
    assert "component_code" in result # Проверяем Fallback-дублирование
    assert result["component_code"] == result["code"]

@patch("mlx_agent.load")
@patch("mlx_agent.generate")
def test_atropos_rl_injection(mock_generate, mock_load):
    """
    Проверяет, что опыт AtroposMemory (LanceDB)
    успешно встраивается в системный промпт LLM
    """
    mock_load.return_value = ("mock_model", "mock_tokenizer")
    mock_generate.return_value = "Test</thought>\n<code>Test</code><|eot_id|>"
    
    with patch("core.atropos_memory.AtroposMemory") as MockMemory:
        mock_instance = MockMemory.return_value
        mock_instance.get_relevant_experience.return_value = "ОШИБКА: Forgot HTTPBearer. ПАТЧ: from fastapi.security import HTTPBearer..."
        
        mind = CoreMind(model_name="test")
        res = mind.think_structured("Промпт", "Схема")
        assert "Test" in res["thought"]
            
    call_kwargs = mock_generate.call_args[1]
    prompt_sent_to_llama = call_kwargs["prompt"]
    assert "Forgot HTTPBearer" in prompt_sent_to_llama
    assert "Bad variable" not in prompt_sent_to_llama
