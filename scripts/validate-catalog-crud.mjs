const baseUrl = process.env.CATALOG_API_URL || "http://localhost:3001/api";
const id = `user:crud-validate-${Date.now()}`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

async function expectJson(path, init = {}) {
  const { response, body } = await request(path, init);
  assert(response.ok, `${path}: expected 2xx, got ${response.status}`);
  return body;
}

async function cleanup() {
  await request(`/catalog/problems/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
}

async function main() {
  await cleanup();
  try {
    const created = await expectJson("/catalog/problems", {
      method: "POST",
      body: JSON.stringify({
        canonical_problem_id: id,
        title: "CRUD 校验题",
        session: "user-validation",
        level: 5,
        question_type: "programming",
        question_number: 900001,
        algorithm_domains: ["二分"],
        problem_types: ["答案查找型"],
        knowledge_points: ["边界收缩", "单调性判断"],
        statement: "给定一个有序数组和目标值，输出目标值第一次出现的位置。",
        answer: "输出下标；不存在输出 -1。",
        explanation: "使用二分查找维护左右边界，遇到目标值后继续向左收缩。",
        solution_code: "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  int n,x;\n  cin>>n>>x;\n  vector<int>a(n);\n  for(int&i:a) cin>>i;\n  int l=0,r=n-1,ans=-1;\n  while(l<=r){\n    int m=l+(r-l)/2;\n    if(a[m]>=x){\n      if(a[m]==x) ans=m;\n      r=m-1;\n    }else{\n      l=m+1;\n    }\n  }\n  cout<<ans;\n  return 0;\n}\n",
        sample_cases: [{ input: "5 3\\n1 2 3 3 4", output: "2" }],
        visual_assets: [{ asset_url: "https://example.com/gesp-crud.png", alt_text: "CRUD 校验示意图" }],
        source_url: "https://example.com/gesp-crud-source",
        source_title: "CRUD 校验来源"
      })
    });
    assert(created.id === id, "created problem id mismatch");
    assert(created.detail?.programming_solution?.code?.includes("int main"), "created C++ solution was not persisted");
    assert(created.detail?.sample_cases?.cases?.length === 1, "created sample cases were not persisted");
    assert(created.detail?.visual_assets?.assets?.length === 1, "created visual assets were not persisted");
    assert(created.detail?.source_links?.[0]?.url === "https://example.com/gesp-crud-source", "created source link was not persisted");

    const duplicate = await request("/catalog/problems", {
      method: "POST",
      body: JSON.stringify({ canonical_problem_id: id, title: "重复 ID", level: 5, question_type: "programming" })
    });
    assert(duplicate.response.status === 409, `duplicate create expected 409, got ${duplicate.response.status}`);

    const updated = await expectJson(`/catalog/problems/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: "CRUD 校验题已修改",
        level: 4,
        question_type: "selection",
        question_number: 900002,
        choice_options: [
          { key: "A", text: "二分查找" },
          { key: "B", text: "链表遍历" }
        ],
        answer: "A"
      })
    });
    assert(updated.title === "CRUD 校验题已修改", "updated title mismatch");
    assert(updated.level === 4, "updated level mismatch");
    assert(updated.detail?.choice_options?.options?.length === 2, "updated choice options were not persisted");
    assert(updated.detail?.programming_solution?.code?.includes("int main"), "patch should preserve existing C++ solution");

    const deleted = await expectJson(`/catalog/problems/${encodeURIComponent(id)}`, { method: "DELETE" });
    assert(deleted.deleted === true, "delete response mismatch");
    const afterDelete = await request(`/catalog/problems/${encodeURIComponent(id)}`);
    assert(afterDelete.response.status === 404, `deleted problem expected 404, got ${afterDelete.response.status}`);

    console.log("Catalog CRUD validation passed");
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error(`Catalog CRUD validation failed: ${error.message}`);
  process.exitCode = 1;
});
