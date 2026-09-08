from app.ingestion.db_config import db

class ConsistencyChecker:
    """商业模式一致性机器校验护栏引擎"""
    def __init__(self):
        # 初始化注册所有的防御规则
        self.rules = [
            CheckH4MarketSize(),
            CheckH8UnitEconomics()
        ]

    def run_audit(self, project_text: str) -> list[str]:
        """对输入的项目描述进行规则链扫描，返回触发失败的护栏预警信息列表"""
        warnings = []
        for rule in self.rules:
            result = rule.evaluate(project_text)
            if result:
                warnings.append(result)
        return warnings

class CheckH4MarketSize:
    """H4 规则：市场规模定律 (TAM >= SAM >= SOM) 的初筛"""
    def evaluate(self, text: str) -> str:
        # MVP 阶段极简正则或关键字拦截
        # 真实场景应该提取准确的数值进行对比，这里简单探测过于夸张的绝对口径
        if "100%的市场" in text or "垄断整个" in text or "没有竞争对手" in text or "空白市场" in text:
            return "[H4 市场规则预警]: 学生宣称没有竞争对手或将占据100%市场份额，这违反了基础市场定律，请在回复中严厉质问其假设前提。"
        return ""

class CheckH8UnitEconomics:
    """H8 规则：单位经济崩塌 (检查明显的财务漏洞)"""
    def evaluate(self, text: str) -> str:
        # 比如宣称高昂的获客成本却提供免费的/两块钱的低客单价服务
        if "免费" in text and ("补贴" in text or "烧钱" in text):
            return "[H8 单位经济预警]: 学生视图通过烧钱免费模式获客，请质问其LTV(客户终身价值)是否能覆盖CAC(获客成本)。"
        if ("拉新" in text or "地推" in text) and "几毛钱" in text:
            return "[H8 单位经济预警]: 获客单价与其描述的服务可能严重倒挂，请让对方计算真实的单笔订单毛利。"
        return ""

# 暴露一个全局校验引擎实例
constraints_engine = ConsistencyChecker()
