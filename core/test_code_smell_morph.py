from code_smell_morph import CodeSmellMorph

def test_code_smell_low_complexity():
    analyzer = CodeSmellMorph(max_complexity=3)
    clean_code = """
def my_func(a):
    if a > 0:
        return True
    return False
"""
    result = analyzer.analyze_python_code(clean_code)
    assert result["is_clean"] is True
    assert len(result["violators"]) == 0

def test_code_smell_high_complexity():
    analyzer = CodeSmellMorph(max_complexity=2)
    # 3 ifs => complexity > 2
    dirty_code = """
def monster(a):
    if a == 1:
        if a == 2:
            if a == 3:
                return 4
    return 0
"""
    result = analyzer.analyze_python_code(dirty_code)
    assert result["is_clean"] is False
    assert len(result["violators"]) == 1
    assert result["violators"][0]["name"] == "monster"
    assert result["violators"][0]["complexity"] > 2

def test_code_smell_syntax_err():
    analyzer = CodeSmellMorph()
    res = analyzer.analyze_python_code("def foo(: break")
    assert res["is_clean"] is False
    assert res["violators"][0]["type"] == "syntax_error"
