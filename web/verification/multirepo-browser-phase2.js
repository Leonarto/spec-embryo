async (page) => {
  const draft=page.locator('.question-card').filter({hasText:'Remapped identity?'}).locator('textarea');
  if(await draft.inputValue()!=='stale registered draft for recovery')throw Error('Draft not held');
  await page.locator('.question-form button[type="submit"]').first().click();
  await page.getByText('The repository identity changed.',{exact:false}).waitFor();
  const value=await draft.inputValue(),readOnly=await draft.getAttribute('readonly'),disabled=await page.locator('.question-form button[type="submit"]').first().isDisabled();
  if(value!=='stale registered draft for recovery'||readOnly===null||!disabled)throw Error('Mismatch did not freeze draft');
  return {passed:'remapped identity retains copyable draft and blocks further save',value,readOnly,disabled};
}
