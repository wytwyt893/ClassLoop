import { useState, useEffect } from "react";
import { api, useMutation } from "../services/dataProvider";
import { Doc } from "../services/types";
import { toast } from "sonner";

interface ConditionalLogicModalProps {
  element: Doc<"elements">;
  availableElements: Doc<"elements">[];
  onClose: () => void;
}

export function ConditionalLogicModal({ element, availableElements, onClose }: ConditionalLogicModalProps) {
  const [enabled, setEnabled] = useState(element.conditionalLogic?.enabled || false);
  const [dependsOnElementId, setDependsOnElementId] = useState(element.conditionalLogic?.dependsOnElementId || "");
  const [condition, setCondition] = useState(element.conditionalLogic?.condition || "equals");
  const [value, setValue] = useState(element.conditionalLogic?.value || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateConditionalLogic = useMutation(api.elements.updateElementConditionalLogic);

  const dependentElement = availableElements.find(e => e._id === dependsOnElementId);

  const getConditionOptions = () => {
    if (!dependentElement) return [];

    switch (dependentElement.type) {
      case "text_input":
        return [
          { value: "equals", label: "等于" },
          { value: "not_equals", label: "不等于" },
          { value: "contains", label: "包含" },
        ];
      case "number_input":
        return [
          { value: "equals", label: "等于" },
          { value: "not_equals", label: "不等于" },
          { value: "greater_than", label: "大于" },
          { value: "less_than", label: "小于" },
        ];
      case "single_choice":
      case "multiple_choice":
        return [
          { value: "choice_selected", label: "选择了指定选项" },
          { value: "choice_not_selected", label: "未选择指定选项" },
        ];
      default:
        return [];
    }
  };

  const getValueInput = () => {
    if (!dependentElement) return null;

    if (dependentElement.type === "single_choice" || dependentElement.type === "multiple_choice") {
      return (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required={enabled}
        >
          <option value="">请选择一个选项…</option>
          {dependentElement.choices?.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.text || "图片选项"}
            </option>
          ))}
        </select>
      );
    }

    if (dependentElement.type === "number_input") {
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="请输入数值…"
          required={enabled}
        />
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="请输入文本…"
        required={enabled}
      />
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (enabled && (!dependsOnElementId || !condition || (getValueInput() && !value))) {
      toast.error("请完整填写条件显示规则");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateConditionalLogic({
        elementId: element._id,
        conditionalLogic: enabled ? {
          enabled,
          dependsOnElementId: dependsOnElementId as any,
          condition: condition as any,
          value: value || undefined,
        } : undefined,
      });

      toast.success("条件显示规则已更新");
      onClose();
    } catch (error) {
      toast.error("条件显示规则更新失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">设置条件显示规则</h2>
        <p className="text-sm text-gray-600 mb-4">
          当前题目：<strong>{element.title}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">启用条件显示</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              启用后，仅当学生的前置回答满足条件时显示本题
            </p>
          </div>

          {enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  当以下题目满足条件时显示：
                </label>
                <select
                  value={dependsOnElementId}
                  onChange={(e) => {
                    setDependsOnElementId(e.target.value);
                    setValue(""); // Reset value when changing dependent element
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">请选择前置题目…</option>
                  {availableElements.map((el) => (
                    <option key={el._id} value={el._id}>
                      {el.title}
                    </option>
                  ))}
                </select>
              </div>

              {dependentElement && (
                <>
                  <div>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {getConditionOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    {getValueInput()}
                  </div>
                </>
              )}

              {availableElements.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  当前没有可用的前置题目，请先在本题之前添加题目。
                </p>
              )}
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "正在保存…" : "保存规则"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
