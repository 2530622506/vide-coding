import { Button, Col, Form, Input, InputNumber, Modal, Row, Select, Typography } from "antd";
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
  function update<K extends keyof ProblemEditorForm>(key: K, value: ProblemEditorForm[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <Modal
      centered
      closeIcon={<X size={16} />}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>取消</Button>,
        <Button key="save" disabled={!form.title.trim()} icon={<Save size={16} />} loading={saving} onClick={onSave} type="primary">
          保存
        </Button>
      ]}
      onCancel={onCancel}
      open={Boolean(mode)}
      title={mode === "create" ? "新增题目" : "修改题目"}
      width={920}
    >
      <Typography.Paragraph type="secondary">用户维护内容默认保留待复核，不作为官方答案。</Typography.Paragraph>
      <Form className="editorForm" layout="vertical">
        <Form.Item label="题目 ID">
          <Input disabled={mode === "edit"} name="canonical_problem_id" value={form.canonical_problem_id} onChange={(event) => update("canonical_problem_id", event.target.value)} placeholder="留空自动生成" />
        </Form.Item>
        <Form.Item label="标题" required>
          <Input name="title" value={form.title} onChange={(event) => update("title", event.target.value)} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="等级">
              <InputNumber min={1} max={8} value={Number(form.level) || 1} onChange={(value) => update("level", String(value || ""))} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="题号">
              <InputNumber min={1} value={Number(form.question_number) || undefined} onChange={(value) => update("question_number", String(value || ""))} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="题型">
          <Select
            value={form.question_type}
            onChange={(value) => update("question_type", value as ProblemMutationPayload["question_type"])}
            options={[
              { value: "programming", label: "编程" },
              { value: "selection", label: "选择" },
              { value: "judgment", label: "判断" }
            ]}
          />
        </Form.Item>
        <Form.Item label="算法范畴">
          <Input name="algorithm_domains" value={form.algorithm_domains} onChange={(event) => update("algorithm_domains", event.target.value)} placeholder="基础程序设计, 字符串" />
        </Form.Item>
        <Form.Item label="题型标签">
          <Input name="problem_types" value={form.problem_types} onChange={(event) => update("problem_types", event.target.value)} placeholder="数组标记型, 回文判断型" />
        </Form.Item>
        <Form.Item label="知识点">
          <Input name="knowledge_points" value={form.knowledge_points} onChange={(event) => update("knowledge_points", event.target.value)} placeholder="布尔标记, 双指针" />
        </Form.Item>
        <Form.Item label="题面">
          <Input.TextArea name="statement" rows={5} value={form.statement} onChange={(event) => update("statement", event.target.value)} />
        </Form.Item>
        <Form.Item label="选择题选项">
          <Input.TextArea name="choice_options" rows={4} value={form.choice_options} onChange={(event) => update("choice_options", event.target.value)} placeholder={"A. 选项内容\nB. 选项内容"} />
        </Form.Item>
        <Form.Item label="样例">
          <Input.TextArea name="sample_cases" rows={3} value={form.sample_cases} onChange={(event) => update("sample_cases", event.target.value)} placeholder="输入 => 输出，每行一组" />
        </Form.Item>
        <Form.Item label="图片">
          <Input.TextArea name="visual_assets" rows={3} value={form.visual_assets} onChange={(event) => update("visual_assets", event.target.value)} placeholder="图片 URL | 图片说明，每行一张" />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item label="来源链接">
              <Input name="source_url" value={form.source_url} onChange={(event) => update("source_url", event.target.value)} placeholder="https://..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="来源标题">
              <Input name="source_title" value={form.source_title} onChange={(event) => update("source_title", event.target.value)} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="参考答案">
          <Input.TextArea name="answer" rows={3} value={form.answer} onChange={(event) => update("answer", event.target.value)} />
        </Form.Item>
        <Form.Item label="知识点讲解">
          <Input.TextArea name="explanation" rows={4} value={form.explanation} onChange={(event) => update("explanation", event.target.value)} />
        </Form.Item>
        <Form.Item label="C++ 参考解">
          <Input.TextArea name="solution_code" rows={6} value={form.solution_code} onChange={(event) => update("solution_code", event.target.value)} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
