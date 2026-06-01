import { Save, X } from "lucide-react";
import type { EditorMode, ProblemEditorForm } from "../editor";
import type { ProblemMutationPayload } from "../types";

type Props = {
  form: ProblemEditorForm;
  mode: EditorMode | null;
  onCancel: () => void;
  onChange: (form: ProblemEditorForm) => void;
  onSave: () => void;
  saving: boolean;
};

export function ProblemEditorModal({ form, mode, onCancel, onChange, onSave, saving }: Props) {
  if (!mode) {
    return null;
  }

  function update<K extends keyof ProblemEditorForm>(key: K, value: ProblemEditorForm[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <div className="modalBackdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        onCancel();
      }
    }}>
      <section aria-modal="true" className="editorModal" role="dialog" aria-labelledby="problem-editor-title">
        <div className="editorHeader">
          <div>
            <div className="paneTitle" id="problem-editor-title">{mode === "create" ? "新增题目" : "修改题目"}</div>
            <p>用户维护内容默认保留待复核，不作为官方答案。</p>
          </div>
          <button className="iconButton small" type="button" title="关闭编辑" onClick={onCancel}>
            <X size={16} />
          </button>
        </div>

        <div className="editorForm">
          <label>
            <span>题目 ID</span>
            <input disabled={mode === "edit"} name="canonical_problem_id" value={form.canonical_problem_id} onChange={(event) => update("canonical_problem_id", event.target.value)} placeholder="留空自动生成" />
          </label>
          <label>
            <span>标题</span>
            <input name="title" value={form.title} onChange={(event) => update("title", event.target.value)} />
          </label>
          <div className="editorGrid">
            <label>
              <span>等级</span>
              <input min={1} max={8} name="level" type="number" value={form.level} onChange={(event) => update("level", event.target.value)} />
            </label>
            <label>
              <span>题号</span>
              <input min={1} name="question_number" type="number" value={form.question_number} onChange={(event) => update("question_number", event.target.value)} />
            </label>
          </div>
          <label>
            <span>题型</span>
            <select name="question_type" value={form.question_type} onChange={(event) => update("question_type", event.target.value as ProblemMutationPayload["question_type"])}>
              <option value="programming">编程</option>
              <option value="selection">选择</option>
              <option value="judgment">判断</option>
            </select>
          </label>
          <label>
            <span>算法范畴</span>
            <input name="algorithm_domains" value={form.algorithm_domains} onChange={(event) => update("algorithm_domains", event.target.value)} placeholder="基础程序设计, 字符串" />
          </label>
          <label>
            <span>题型标签</span>
            <input name="problem_types" value={form.problem_types} onChange={(event) => update("problem_types", event.target.value)} placeholder="数组标记型, 回文判断型" />
          </label>
          <label>
            <span>知识点</span>
            <input name="knowledge_points" value={form.knowledge_points} onChange={(event) => update("knowledge_points", event.target.value)} placeholder="布尔标记, 双指针" />
          </label>
          <label>
            <span>题面</span>
            <textarea name="statement" rows={5} value={form.statement} onChange={(event) => update("statement", event.target.value)} />
          </label>
          <label>
            <span>选择题选项</span>
            <textarea name="choice_options" rows={4} value={form.choice_options} onChange={(event) => update("choice_options", event.target.value)} placeholder={"A. 选项内容\nB. 选项内容"} />
          </label>
          <label>
            <span>样例</span>
            <textarea name="sample_cases" rows={3} value={form.sample_cases} onChange={(event) => update("sample_cases", event.target.value)} placeholder="输入 => 输出，每行一组" />
          </label>
          <label>
            <span>图片</span>
            <textarea name="visual_assets" rows={3} value={form.visual_assets} onChange={(event) => update("visual_assets", event.target.value)} placeholder="图片 URL | 图片说明，每行一张" />
          </label>
          <div className="editorGrid">
            <label>
              <span>来源链接</span>
              <input name="source_url" value={form.source_url} onChange={(event) => update("source_url", event.target.value)} placeholder="https://..." />
            </label>
            <label>
              <span>来源标题</span>
              <input name="source_title" value={form.source_title} onChange={(event) => update("source_title", event.target.value)} />
            </label>
          </div>
          <label>
            <span>参考答案</span>
            <textarea name="answer" rows={3} value={form.answer} onChange={(event) => update("answer", event.target.value)} />
          </label>
          <label>
            <span>知识点讲解</span>
            <textarea name="explanation" rows={4} value={form.explanation} onChange={(event) => update("explanation", event.target.value)} />
          </label>
          <label>
            <span>C++ 参考解</span>
            <textarea name="solution_code" rows={6} value={form.solution_code} onChange={(event) => update("solution_code", event.target.value)} />
          </label>
        </div>

        <div className="editorActions modalActions">
          <button className="textButton" type="button" onClick={onCancel}>取消</button>
          <button className="textButton primary" type="button" disabled={saving || !form.title.trim()} onClick={onSave}>
            <Save size={16} /> {saving ? "保存中" : "保存"}
          </button>
        </div>
      </section>
    </div>
  );
}
