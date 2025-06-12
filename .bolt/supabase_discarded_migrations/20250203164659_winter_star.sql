-- Get the business_id for the specific user
WITH user_business AS (
  SELECT business_id 
  FROM users 
  WHERE id = 'acb3bbf3-74e2-4483-9544-8531e9cd953f'
)

-- Delete all appointments not related to the business
DELETE FROM appointments 
WHERE business_id NOT IN (SELECT business_id FROM user_business);

-- Delete all services not related to the business
DELETE FROM services 
WHERE business_id NOT IN (SELECT business_id FROM user_business);

-- Delete all branches not related to the business
DELETE FROM branches 
WHERE business_id NOT IN (SELECT business_id FROM user_business);

-- Delete all business hours not related to the business
DELETE FROM business_hours 
WHERE business_id NOT IN (SELECT business_id FROM user_business);

-- Delete all staff services not related to the business's staff
DELETE FROM staff_services 
WHERE staff_id NOT IN (
  SELECT id FROM users 
  WHERE business_id IN (SELECT business_id FROM user_business)
);

-- Delete all staff hours not related to the business's staff
DELETE FROM staff_hours 
WHERE staff_id NOT IN (
  SELECT id FROM users 
  WHERE business_id IN (SELECT business_id FROM user_business)
);

-- Delete all customers not related to the business
DELETE FROM customers 
WHERE business_id NOT IN (SELECT business_id FROM user_business);

-- Delete all users not related to the business
DELETE FROM users 
WHERE business_id NOT IN (SELECT business_id FROM user_business);

-- Finally, delete all businesses except the one related to our user
DELETE FROM businesses 
WHERE id NOT IN (SELECT business_id FROM user_business);