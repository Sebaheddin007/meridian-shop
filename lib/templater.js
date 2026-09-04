// Renders {{ expression }} placeholders by evaluating them as JS against a
// small context object. Meant for things like {{ order.total }} — but since
// it's a real expression evaluator, any JS expression is accepted.
function renderTemplate(template, context) {
  return template.replace(/\{\{(.*?)\}\}/g, (_, expr) => {
    try {
      const fn = new Function(...Object.keys(context), `return (${expr});`);
      return fn(...Object.values(context));
    } catch (e) {
      return `[template error: ${e.message}]`;
    }
  });
}

module.exports = { renderTemplate };
