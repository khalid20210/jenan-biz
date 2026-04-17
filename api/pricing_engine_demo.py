"""
Dynamic Pricing Engine Demo
- حساب التكلفة الفعلية (API, Server, Data)
- تطبيق هامش الربح
- فرض الحد الأدنى والافتراضي وكسر السقف
- قابل للتكامل مع بقية النظام
"""

from typing import Dict

class PricingEngine:
    def __init__(self, profit_margin: float = 0.5, base_price: float = 1000.0, default_price: float = 5000.0):
        self.profit_margin = profit_margin  # نسبة الربح (مثال: 0.5 = 50%)
        self.base_price = base_price        # الحد الأدنى
        self.default_price = default_price  # السعر الافتراضي للمشاريع المتوسطة

    def calculate_cost(self, usage: Dict[str, float]) -> float:
        """
        usage: dict with keys: api, server, data
        القيم بالريال السعودي
        """
        return usage.get('api', 0) + usage.get('server', 0) + usage.get('data', 0)

    def get_price(self, usage: Dict[str, float], project_type: str = "standard") -> float:
        cost = self.calculate_cost(usage)
        # كسر السقف للمشاريع المعقدة
        if project_type in ["industrial", "tech", "complex"]:
            price = max(cost * (1 + self.profit_margin), self.base_price)
            # لا يوجد سقف أعلى
        else:
            price = max(cost * (1 + self.profit_margin), self.base_price)
            # سقف افتراضي للمشاريع المتوسطة
            if price < self.default_price:
                price = self.default_price
        return price

# نموذج تجريبي
if __name__ == "__main__":
    engine = PricingEngine(profit_margin=0.6)  # مثال: 60% ربح
    usage_example = {
        'api': 400,
        'server': 200,
        'data': 100
    }
    print("سعر مشروع عادي:", engine.get_price(usage_example, project_type="standard"))
    print("سعر مشروع صناعي:", engine.get_price(usage_example, project_type="industrial"))
