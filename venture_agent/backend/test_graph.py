import os
# 为了确保能够在 backend 目录下直接运行模块，导入必要的路径设置
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from langchain_core.messages import HumanMessage
from app.agent.graph import app_graph

def test_tutor():
    print("\n" + "="*50)
    print("测试场景 1: 迷茫的学生提问基础商业概念")
    print("预期路由: Router -> learning_tutor (A1学习辅导Agent)")
    print("="*50)
    
    # 模拟学生的输入
    user_input = "老师好，我想参加咱们学校的创新创业大赛，但是我完全不懂商业，你能给我通俗地解释一下什么叫做'MVP (最小可行性产品)'吗？"
    print(f"👤 学生输入: {user_input}\n")
    
    # 构建状态树的初始状态，并设定一个 Thread ID 用作记忆标签
    initial_state = {"messages": [HumanMessage(content=user_input)]}
    config = {"configurable": {"thread_id": "student_tutor_test_1"}}
    
    # 调用并自动流转代理图
    result = app_graph.invoke(initial_state, config=config)
    
    print("\n✅ [最终系统回复]:")
    print(result.get("messages", [])[-1].content)


def test_coach():
    print("\n" + "="*50)
    print("测试场景 2: 自信的学生带着具体的项目找毛病")
    print("预期路由: Router -> project_coach (A2项目教练Agent)")
    print("="*50)
    
    # 模拟学生的输入
    user_input = "我想做一个校园快递代拿的APP。现在的痛点是大学生懒得去校外拿快递，我觉得大家肯定愿意花2块钱让我代拿，这个市场很大！"
    print(f"👤 学生输入: {user_input}\n")
    
    # 构建状态树的初始状态，分配一个新的 Thread ID
    initial_state = {"messages": [HumanMessage(content=user_input)]}
    config = {"configurable": {"thread_id": "student_coach_test_1"}}
    
    # 调用并自动流转代理图
    result = app_graph.invoke(initial_state, config=config)
    
    print("\n✅ [最终系统回复]:")
    print(result.get("messages", [])[-1].content)


if __name__ == "__main__":
    print("------ VentureAgent 核心路由与智能体联调测试 ------\n")
    test_tutor()
    
    print("\n" + "*"*50)
    print("等待2秒以防 API 速率限制...")
    import time
    time.sleep(2)
    
    test_coach()
