# -*- coding: utf-8 -*-
"""
向 Neo4j 批量生成并写入高仿真的 VentureAgent 模拟数据。

数据格式与 extract.py 中的抽取结果保持一致：
1. ProjectInfo: name / market / technology / participant
2. 入库结构: Project / Market / Technology / Participant / Value_Loop
3. 关系结构:
   - (Project)-[:PART_OF_LOOP]->(Value_Loop)
   - (Market)-[:TARGETED_BY_LOOP]->(Value_Loop)
   - (Technology)-[:ENABLES_LOOP]->(Value_Loop)
   - (Participant)-[:PARTICIPATES_IN]->(Value_Loop)

默认生成 10000 条“项目级”模拟数据，不会主动清空现有数据库。
"""

from __future__ import annotations

import argparse
import random
import sys
from typing import Iterable, List

from pydantic import BaseModel, Field

from app.ingestion.db_config import db


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


class ProjectInfo(BaseModel):
    name: str = Field(description="项目的名称")
    market: str = Field(description="该项目所针对的市场或目标受众")
    technology: str = Field(description="该项目使用的核心技术或所提供的产品服务形式")
    participant: str = Field(description="项目的参与者或典型用户画像")


class ExtractedData(BaseModel):
    projects: List[ProjectInfo] = Field(description="文本中提取出的项目列表")


class GeneratedProject(ProjectInfo):
    category: str = Field(description="项目所属赛道/主题")
    loop_id: str = Field(description="Value_Loop 的唯一标识")
    loop_description: str = Field(description="价值闭环描述")


BRANDS = [
    "青梧", "知行", "云岚", "禾木", "星澜", "极昼", "启衡", "格物", "凌川", "海若",
    "卓见", "未名", "青穗", "元启", "千策", "拓境", "明川", "灵犀", "景曜", "澄观",
    "象维", "行知", "初禾", "向辰", "新衡", "玖川", "云序", "辰拓", "泊安", "远岫",
]

REGIONS = [
    "华北", "华东", "华南", "华中", "西南", "西北", "东北",
    "长三角", "珠三角", "成渝", "京津冀", "环渤海",
]

VALUE_ACTIONS = [
    "需求识别", "精准触达", "标准化交付", "过程追踪", "效果复盘",
    "服务匹配", "数据沉淀", "反馈闭环", "复购转化", "口碑传播",
]

DOMAIN_PACKS = [
    {
        "theme": "智慧校园",
        "products": [
            "宿舍能耗优化", "二手教材循环", "校园跑腿调度", "实验室预约协同", "考研座位管理",
            "心理咨询预约", "社团活动运营", "就业实习对接", "失物招领协同", "校园场馆预约",
        ],
        "market_segments": [
            "高校智慧校园服务市场", "本科院校后勤数字化市场", "高校学习生活服务市场",
            "校园空间管理数字化市场", "高校学生服务平台市场",
        ],
        "participants": [
            "高校本科生与后勤管理员", "在校学生与校园兼职服务者", "实验室管理员与科研助理",
            "社团骨干与院系辅导员", "考研学生与图书馆管理人员",
        ],
        "technologies": [
            "微信小程序", "LBS 路径规划", "规则引擎", "OCR 识别", "IoT 传感器",
            "时序能耗建模", "消息推送编排", "轻量化数据中台",
        ],
        "suffixes": ["平台", "系统", "助手", "中台", "引擎"],
    },
    {
        "theme": "绿色低碳",
        "products": [
            "楼宇碳排监测", "园区光储协同", "垃圾分类督导", "用水异常预警", "绿色出行积分",
            "再生资源回收", "冷链节能调度", "公共建筑节能诊断", "校园零碳运营", "充电桩负载优化",
        ],
        "market_segments": [
            "公共机构节能减排市场", "园区能源管理市场", "校园双碳治理市场",
            "城市绿色运维市场", "再生资源回收数字化市场",
        ],
        "participants": [
            "园区运维人员与节能管理者", "校内低碳社团与后勤部门", "物业经理与能源审计人员",
            "社区居民与回收服务商", "新能源车主与充电站运营方",
        ],
        "technologies": [
            "碳排放核算模型", "边缘网关", "时序数据库", "负荷预测算法",
            "智能计量设备", "GIS 可视化", "能耗诊断模型", "碳积分规则引擎",
        ],
        "suffixes": ["平台", "系统", "方案", "引擎", "管家"],
    },
    {
        "theme": "医疗健康",
        "products": [
            "慢病随访管理", "基层分诊协同", "康复训练评估", "院内感染预警", "药事合规巡检",
            "互联网复诊服务", "孕产健康管理", "睡眠干预评估", "眼健康筛查", "术后随访助手",
        ],
        "market_segments": [
            "基层医疗数字化市场", "慢病管理服务市场", "区域医疗协同市场",
            "康复医疗服务市场", "专科健康管理市场",
        ],
        "participants": [
            "社区医生与慢病患者", "康复治疗师与术后患者", "药师与基层门诊管理者",
            "孕产妇与妇幼保健人员", "专科医生与复诊患者",
        ],
        "technologies": [
            "医疗知识图谱", "电子病历结构化", "风险评分模型", "远程随访工作流",
            "语音转写", "OCR 病历解析", "健康画像建模", "指标预警规则引擎",
        ],
        "suffixes": ["平台", "系统", "助手", "工作站", "中台"],
    },
    {
        "theme": "银发经济",
        "products": [
            "居家跌倒预警", "认知训练陪伴", "养老膳食管理", "长护险协同理赔", "长者用药提醒",
            "社区助老调度", "养老机构巡检", "适老化改造评估", "长者社交活动运营", "康养旅居服务",
        ],
        "market_segments": [
            "社区养老服务市场", "居家康养服务市场", "养老机构数字化市场",
            "银发健康消费市场", "长者照护协同市场",
        ],
        "participants": [
            "独居老人与社区网格员", "养老院护理员与机构管理者", "长者家庭与照护服务商",
            "康养旅居老人与运营团队", "长护险参保人群与服务机构",
        ],
        "technologies": [
            "毫米波感知", "可穿戴设备接入", "异常行为识别", "语音交互",
            "服务排班引擎", "养老画像建模", "IoT 设备联动", "用药规则提醒",
        ],
        "suffixes": ["平台", "系统", "助手", "管家", "方案"],
    },
    {
        "theme": "农业科技",
        "products": [
            "温室环境调控", "病虫害识别", "育苗计划管理", "果园采摘调度", "农资供应协同",
            "土壤墒情监测", "养殖疫病预警", "农产品分级定价", "冷链溯源管理", "农业无人巡检",
        ],
        "market_segments": [
            "设施农业数字化市场", "县域农产品供应链市场", "智慧种植服务市场",
            "畜牧养殖数智化市场", "农产品品牌化运营市场",
        ],
        "participants": [
            "合作社种植户与农技员", "家庭农场主与采购商", "果园经营者与分拣人员",
            "养殖场管理者与兽医人员", "县域农产品经纪人与品牌运营者",
        ],
        "technologies": [
            "多光谱视觉识别", "农业传感网络", "病虫害识别模型", "冷链追溯码",
            "智能灌溉控制", "卫星遥感数据融合", "移动巡检终端", "供需预测模型",
        ],
        "suffixes": ["平台", "系统", "助手", "中台", "方案"],
    },
    {
        "theme": "智能制造",
        "products": [
            "设备故障预测", "产线换型优化", "工艺参数推荐", "质检缺陷识别", "备件库存协同",
            "工厂安环巡检", "工位节拍分析", "能耗精益管控", "电子看板协同", "供应商交付预警",
        ],
        "market_segments": [
            "离散制造数智化市场", "中小工厂提质增效市场", "设备运维服务市场",
            "工厂质量管理市场", "供应链协同制造市场",
        ],
        "participants": [
            "生产经理与设备工程师", "质量主管与现场班组长", "工厂厂长与供应链计划员",
            "安环经理与巡检人员", "工艺工程师与车间班长",
        ],
        "technologies": [
            "工业时序数据分析", "机器视觉", "异常检测模型", "MES 数据集成",
            "工业边缘计算", "数字孪生看板", "预测维护算法", "排产优化求解器",
        ],
        "suffixes": ["平台", "系统", "中台", "工作站", "引擎"],
    },
    {
        "theme": "文旅文创",
        "products": [
            "景区客流预测", "研学路线编排", "博物馆导览讲解", "非遗体验预约", "城市夜游运营",
            "民宿收益管理", "乡村旅游内容运营", "文创商品选品", "沉浸式剧游协同", "展陈互动讲解",
        ],
        "market_segments": [
            "景区数字运营市场", "文旅内容服务市场", "城市文旅消费市场",
            "研学旅行组织市场", "博物馆数字讲解市场",
        ],
        "participants": [
            "景区运营人员与游客", "研学机构老师与亲子家庭", "博物馆讲解员与参观者",
            "乡村民宿主理人与旅行者", "文创品牌运营者与消费人群",
        ],
        "technologies": [
            "AR 导览", "内容推荐算法", "客流热力分析", "语音讲解合成",
            "票务预约引擎", "数字藏品管理", "私域运营分析", "LBS 轨迹建模",
        ],
        "suffixes": ["平台", "系统", "助手", "引擎", "工作台"],
    },
    {
        "theme": "物流供应链",
        "products": [
            "末端配送调度", "仓内拣货优化", "冷链履约监控", "干线运力撮合", "回程车协同管理",
            "订单异常预警", "供应补货建议", "包装损耗分析", "跨仓库存协同", "门店到仓补货",
        ],
        "market_segments": [
            "城市即时配送市场", "区域仓配一体化市场", "冷链物流管理市场",
            "商贸流通供应链市场", "连锁零售补货协同市场",
        ],
        "participants": [
            "仓管员与配送站点主管", "冷链司机与品控人员", "零售门店店长与供应链计划员",
            "商贸企业采购与运力服务商", "同城骑手与履约调度员",
        ],
        "technologies": [
            "路径规划算法", "WMS 数据集成", "温控传感器接入", "异常事件预警",
            "时空调度模型", "电子围栏", "补货预测模型", "移动拣货终端",
        ],
        "suffixes": ["平台", "系统", "引擎", "中台", "方案"],
    },
    {
        "theme": "教育科技",
        "products": [
            "课堂行为分析", "作业反馈诊断", "教研备课协同", "职业能力训练", "校企课程共建",
            "实验教学管理", "编程学习陪练", "语言口语评测", "实训排课协同", "教学质量画像",
        ],
        "market_segments": [
            "高校教学数字化市场", "职业教育服务市场", "校企协同育人市场",
            "教学评价分析市场", "实训管理平台市场",
        ],
        "participants": [
            "任课教师与本科学生", "教研组长与青年教师", "职业院校学生与企业导师",
            "实训中心管理员与授课老师", "语言学习者与培训机构教师",
        ],
        "technologies": [
            "学习画像建模", "语音评测", "作业批改规则引擎", "知识点图谱",
            "课堂行为识别", "教学分析看板", "RAG 教研助手", "排课优化算法",
        ],
        "suffixes": ["平台", "系统", "助手", "工作站", "中台"],
    },
    {
        "theme": "企业服务",
        "products": [
            "招聘面试协同", "销售线索培育", "客户成功运营", "合同审阅流转", "培训认证管理",
            "采购比价协同", "发票风控识别", "知识库问答", "会议纪要提炼", "客服质检分析",
        ],
        "market_segments": [
            "中小企业数字化服务市场", "人力资源协同市场", "企业知识管理市场",
            "销售运营提效市场", "法务与财务协同市场",
        ],
        "participants": [
            "HR 与求职候选人", "销售代表与客户成功经理", "法务专员与业务负责人",
            "采购经理与供应商", "客服主管与坐席团队",
        ],
        "technologies": [
            "LLM 工作流编排", "知识库检索增强", "OCR 票据解析", "对话质检模型",
            "流程自动化引擎", "语义检索", "销售评分模型", "会议音频转写",
        ],
        "suffixes": ["平台", "系统", "助手", "中台", "引擎"],
    },
    {
        "theme": "宠物经济",
        "products": [
            "宠物健康档案", "宠物寄养撮合", "上门洗护调度", "宠物饮食建议", "宠物保险协同",
            "宠物门店会员运营", "宠物行为训练记录", "宠物体检预约", "宠物用品订阅", "宠物医院复诊提醒",
        ],
        "market_segments": [
            "宠物医疗服务市场", "宠物本地生活市场", "宠物消费升级市场",
            "宠物门店数字化市场", "宠物保险服务市场",
        ],
        "participants": [
            "年轻宠物主与宠物医院", "宠物店店长与会员用户", "训犬师与宠物家庭",
            "寄养服务商与出差养宠人群", "宠物保险顾问与高频养宠用户",
        ],
        "technologies": [
            "宠物健康画像", "会员分层算法", "本地生活撮合引擎", "预约排班系统",
            "问卷诊断模型", "复诊提醒工作流", "门店 SaaS", "小程序商城",
        ],
        "suffixes": ["平台", "系统", "助手", "管家", "方案"],
    },
    {
        "theme": "新能源出行",
        "products": [
            "充电站选址评估", "车队能耗管理", "电池健康诊断", "公交补能调度", "园区车桩协同",
            "换电站运营分析", "物流车路书优化", "两轮车换电管理", "车网互动调度", "新能源维保协同",
        ],
        "market_segments": [
            "新能源补能服务市场", "车队运营管理市场", "园区能源交通协同市场",
            "物流新能源车运营市场", "两轮换电数字化市场",
        ],
        "participants": [
            "新能源车主与充电运营商", "物流车队长与调度员", "公交场站运维人员与司机",
            "园区物业与车桩建设方", "两轮骑手与换电服务商",
        ],
        "technologies": [
            "电池 SOH 估算", "充电负荷预测", "GIS 选址评估", "车联网数据分析",
            "路径规划算法", "桩端设备接入", "能量调度模型", "预约补能引擎",
        ],
        "suffixes": ["平台", "系统", "中台", "引擎", "助手"],
    },
    {
        "theme": "乡村振兴",
        "products": [
            "农文旅联营", "乡镇直播助农", "县域零工撮合", "乡村民宿运营", "乡村医疗巡诊协同",
            "返乡创业服务", "村集体资产管理", "乡村物流共配", "特色农产品品牌化", "基层治理协同",
        ],
        "market_segments": [
            "县域数字服务市场", "乡村振兴产业服务市场", "农村电商协同市场",
            "乡村文旅运营市场", "基层治理数字化市场",
        ],
        "participants": [
            "返乡创业青年与县域服务机构", "村干部与村集体经营主体", "乡村民宿主理人与周边游客",
            "乡镇商家与直播助农团队", "基层网格员与村民服务对象",
        ],
        "technologies": [
            "直播运营分析", "县域供应链协同", "村务数据看板", "乡村地图导航",
            "社区团购履约引擎", "资产台账管理", "短视频内容推荐", "基层服务流程引擎",
        ],
        "suffixes": ["平台", "系统", "工作台", "助手", "方案"],
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="批量生成 VentureAgent Neo4j 模拟数据")
    parser.add_argument("--count", type=int, default=10000, help="要生成的项目数量，默认 10000")
    parser.add_argument("--batch-size", type=int, default=500, help="Neo4j 批量写入大小，默认 500")
    parser.add_argument("--seed", type=int, default=20260330, help="随机种子，默认 20260330")
    return parser.parse_args()


def pick_two_distinct(rng: random.Random, values: list[str]) -> tuple[str, str]:
    first = rng.choice(values)
    second = rng.choice(values)
    while second == first:
        second = rng.choice(values)
    return first, second


def build_loop_description(
    market: str,
    technology: str,
    participant: str,
    theme: str,
    rng: random.Random,
) -> str:
    action_1, action_2 = pick_two_distinct(rng, VALUE_ACTIONS)
    action_3, action_4 = pick_two_distinct(rng, VALUE_ACTIONS)
    return (
        f"面向{market}，通过{technology}服务{participant}，围绕{theme}场景形成"
        f"“{action_1}—{action_2}—{action_3}—{action_4}”的价值闭环。"
    )


def build_project_name(
    brand: str,
    product: str,
    suffix: str,
    region: str,
    index: int,
    used_names: set[str],
) -> str:
    candidates = [
        f"{brand}{product}{suffix}",
        f"{brand}{region}{product}{suffix}",
        f"{brand}{product}{region}{suffix}",
    ]

    for candidate in candidates:
        if candidate not in used_names:
            used_names.add(candidate)
            return candidate

    fallback = f"{brand}{product}{suffix}-{region}-{index:05d}"
    used_names.add(fallback)
    return fallback


def generate_mock_projects(count: int, seed: int) -> list[GeneratedProject]:
    rng = random.Random(seed)
    used_names: set[str] = set()
    rows: list[GeneratedProject] = []

    for index in range(count):
        pack = DOMAIN_PACKS[index % len(DOMAIN_PACKS)]
        region = rng.choice(REGIONS)
        brand = rng.choice(BRANDS)
        product = rng.choice(pack["products"])
        suffix = rng.choice(pack["suffixes"])
        market_segment = rng.choice(pack["market_segments"])
        participant = rng.choice(pack["participants"])

        tech_count = 2 if rng.random() < 0.78 else 3
        tech_parts = rng.sample(pack["technologies"], k=tech_count)
        technology = " + ".join(tech_parts)
        market = f"{region}{market_segment}"

        name = build_project_name(
            brand=brand,
            product=product,
            suffix=suffix,
            region=region,
            index=index,
            used_names=used_names,
        )
        loop_id = f"VL_GEN_{index + 1:05d}"
        loop_description = build_loop_description(
            market=market,
            technology=technology,
            participant=participant,
            theme=pack["theme"],
            rng=rng,
        )

        rows.append(
            GeneratedProject(
                name=name,
                market=market,
                technology=technology,
                participant=participant,
                category=pack["theme"],
                loop_id=loop_id,
                loop_description=loop_description,
            )
        )

    return rows


def to_extract_format(rows: Iterable[GeneratedProject]) -> ExtractedData:
    return ExtractedData(
        projects=[
            ProjectInfo(
                name=row.name,
                market=row.market,
                technology=row.technology,
                participant=row.participant,
            )
            for row in rows
        ]
    )


def save_batch_to_neo4j(batch: list[GeneratedProject]) -> int:
    cypher = """
    UNWIND $rows AS row
    MERGE (p:Project {name: row.project_name})
      ON CREATE SET
        p.category = row.category,
        p.source = 'mock_generate.py',
        p.mock = true,
        p.created_at = timestamp()
    MERGE (m:Market {name: row.market})
      ON CREATE SET
        m.source = 'mock_generate.py',
        m.mock = true
    MERGE (t:Technology {name: row.technology})
      ON CREATE SET
        t.source = 'mock_generate.py',
        t.mock = true
    MERGE (u:Participant {name: row.participant})
      ON CREATE SET
        u.source = 'mock_generate.py',
        u.mock = true

    MERGE (vl:Value_Loop {loop_id: row.loop_id})
      ON CREATE SET
        vl.description = row.loop_description,
        vl.project_name = row.project_name,
        vl.source = 'mock_generate.py',
        vl.mock = true,
        vl.created_at = timestamp()
      ON MATCH SET
        vl.description = row.loop_description

    MERGE (p)-[:PART_OF_LOOP]->(vl)
    MERGE (m)-[:TARGETED_BY_LOOP]->(vl)
    MERGE (t)-[:ENABLES_LOOP]->(vl)
    MERGE (u)-[:PARTICIPATES_IN]->(vl)

    RETURN count(vl) AS written
    """

    payload = {
        "rows": [
            {
                "project_name": row.name,
                "market": row.market,
                "technology": row.technology,
                "participant": row.participant,
                "category": row.category,
                "loop_id": row.loop_id,
                "loop_description": row.loop_description,
            }
            for row in batch
        ]
    }

    result = db.execute_query(cypher, payload)
    if not result:
        return 0
    return int(result[0]["written"])


def save_to_neo4j(rows: list[GeneratedProject], batch_size: int) -> None:
    total = len(rows)
    written = 0
    for start in range(0, total, batch_size):
        batch = rows[start:start + batch_size]
        batch_written = save_batch_to_neo4j(batch)
        written += batch_written
        print(
            f"已写入批次 {start // batch_size + 1} "
            f"({start + 1}-{start + len(batch)}/{total})，批次记录数: {batch_written}"
        )
    print(f"完成写入，共处理 {total} 条模拟项目数据。")
    print(f"Value_Loop 批量写入累计返回: {written}")


def main() -> None:
    args = parse_args()
    if args.count <= 0:
        raise ValueError("--count 必须大于 0")
    if args.batch_size <= 0:
        raise ValueError("--batch-size 必须大于 0")

    print("开始生成 VentureAgent 模拟数据...")
    print(f"目标数量: {args.count}")
    print(f"批量大小: {args.batch_size}")
    print(f"随机种子: {args.seed}")

    generated_rows = generate_mock_projects(count=args.count, seed=args.seed)
    extract_shaped = to_extract_format(generated_rows)

    print("示例数据预览:")
    for sample in extract_shaped.projects[:3]:
        print(
            f"- 项目: {sample.name} | 市场: {sample.market} | "
            f"技术: {sample.technology} | 参与者: {sample.participant}"
        )

    save_to_neo4j(generated_rows, batch_size=args.batch_size)
    print("模拟数据生成结束。")


if __name__ == "__main__":
    try:
        main()
    finally:
        db.close()
