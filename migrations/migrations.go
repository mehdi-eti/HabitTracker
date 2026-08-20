package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

const userRule = "@request.auth.id = user"

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("_pb_users_auth_")
		if err != nil {
			return err
		}

		// ============================================================
		// HABITS
		// ============================================================

		habits := core.NewBaseCollection("habits")

		habits.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				CollectionId:  users.Id,
				CascadeDelete: true,
				MaxSelect:     1,
			},
			&core.TextField{
				Name:     "recordId",
				Required: true,
			},
			&core.TextField{Name: "title"},
			&core.TextField{Name: "description"},
			&core.TextField{Name: "category"},
			&core.NumberField{Name: "createdAt"},
			&core.TextField{Name: "mode"},
			&core.JSONField{Name: "selectedDays"},
			&core.TextField{Name: "status"},
			&core.NumberField{Name: "version"},
			&core.TextField{Name: "originalHabitId"},
			&core.TextField{Name: "reminderTime"},
			&core.BoolField{Name: "hidden"},
			&core.TextField{Name: "currentStartDate"},
		)

		applyUserRules(habits)

		if err := app.Save(habits); err != nil {
			return err
		}

		// ============================================================
		// DAY RECORDS
		// ============================================================

		dayRecords := core.NewBaseCollection("dayRecords")

		dayRecords.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				CollectionId:  users.Id,
				CascadeDelete: true,
				MaxSelect:     1,
			},
			&core.TextField{
				Name:     "recordId",
				Required: true,
			},
			&core.TextField{Name: "habitId"},
			&core.TextField{Name: "date"},
			&core.BoolField{Name: "completed"},
			&core.TextField{Name: "note"},
			&core.NumberField{Name: "updatedAt"},
		)

		applyUserRules(dayRecords)

		if err := app.Save(dayRecords); err != nil {
			return err
		}

		// ============================================================
		// SETTINGS
		// ============================================================

		settings := core.NewBaseCollection("settings")

		settings.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				CollectionId:  users.Id,
				CascadeDelete: true,
				MaxSelect:     1,
			},
			&core.TextField{
				Name:     "recordId",
				Required: true,
			},
			&core.TextField{Name: "language"},
			&core.TextField{Name: "theme"},
			&core.TextField{Name: "globalReminderTime"},
		)

		applyUserRules(settings)

		if err := app.Save(settings); err != nil {
			return err
		}

		// ============================================================
		// WORKOUT PLANS
		// ============================================================

		workoutPlans := core.NewBaseCollection("workoutPlans")

		workoutPlans.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				CollectionId:  users.Id,
				CascadeDelete: true,
				MaxSelect:     1,
			},
			&core.TextField{
				Name:     "recordId",
				Required: true,
			},
			&core.TextField{Name: "name"},
			&core.TextField{Name: "description"},
			&core.NumberField{Name: "createdAt"},
			&core.TextField{Name: "status"},
			&core.NumberField{Name: "durationDays"},
			&core.TextField{Name: "startDate"},
			&core.NumberField{Name: "version"},
		)

		applyUserRules(workoutPlans)

		if err := app.Save(workoutPlans); err != nil {
			return err
		}

		// ============================================================
		// WORKOUT PLAN VERSIONS
		// ============================================================

		workoutPlanVersions := core.NewBaseCollection("workoutPlanVersions")

		workoutPlanVersions.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				CollectionId:  users.Id,
				CascadeDelete: true,
				MaxSelect:     1,
			},
			&core.TextField{
				Name:     "recordId",
				Required: true,
			},
			&core.TextField{Name: "planId"},
			&core.NumberField{Name: "version"},
			&core.NumberField{Name: "createdAt"},
			&core.JSONField{Name: "data"},
		)

		applyUserRules(workoutPlanVersions)

		if err := app.Save(workoutPlanVersions); err != nil {
			return err
		}

		// ============================================================
		// WORKOUT DAILY RECORDS
		// ============================================================

		workoutDailyRecords := core.NewBaseCollection("workoutDailyRecords")

		workoutDailyRecords.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				CollectionId:  users.Id,
				CascadeDelete: true,
				MaxSelect:     1,
			},
			&core.TextField{
				Name:     "recordId",
				Required: true,
			},
			&core.TextField{Name: "planId"},
			&core.TextField{Name: "date"},
			&core.BoolField{Name: "completed"},
			&core.BoolField{Name: "restDay"},
		)

		applyUserRules(workoutDailyRecords)

		if err := app.Save(workoutDailyRecords); err != nil {
			return err
		}

		// ============================================================
		// WORKOUT SET RECORDS
		// ============================================================

		workoutSetRecords := core.NewBaseCollection("workoutSetRecords")

		workoutSetRecords.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				CollectionId:  users.Id,
				CascadeDelete: true,
				MaxSelect:     1,
			},
			&core.TextField{
				Name:     "recordId",
				Required: true,
			},
			&core.TextField{Name: "dailyRecordId"},
			&core.TextField{Name: "exerciseId"},
			&core.NumberField{Name: "setIndex"},
			&core.NumberField{Name: "plannedReps"},
			&core.NumberField{Name: "actualReps"},
			&core.NumberField{Name: "plannedWeight"},
			&core.NumberField{Name: "actualWeight"},
		)

		applyUserRules(workoutSetRecords)

		if err := app.Save(workoutSetRecords); err != nil {
			return err
		}

		// ============================================================
		// NUTRITION DAILY RECORDS
		// ============================================================

		nutritionDailyRecords := core.NewBaseCollection("nutritionDailyRecords")

		nutritionDailyRecords.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				CollectionId:  users.Id,
				CascadeDelete: true,
				MaxSelect:     1,
			},
			&core.TextField{
				Name:     "recordId",
				Required: true,
			},
			&core.TextField{Name: "planId"},
			&core.TextField{Name: "date"},
			&core.BoolField{Name: "completed"},
		)

		applyUserRules(nutritionDailyRecords)

		if err := app.Save(nutritionDailyRecords); err != nil {
			return err
		}

		// ============================================================
		// NUTRITION FOOD RECORDS
		// ============================================================

		nutritionFoodRecords := core.NewBaseCollection("nutritionFoodRecords")

		nutritionFoodRecords.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				CollectionId:  users.Id,
				CascadeDelete: true,
				MaxSelect:     1,
			},
			&core.TextField{
				Name:     "recordId",
				Required: true,
			},
			&core.TextField{Name: "dailyRecordId"},
			&core.TextField{Name: "foodId"},
			&core.TextField{Name: "plannedQuantity"},
			&core.BoolField{Name: "consumed"},
			&core.BoolField{Name: "consumedMoreThanPlanned"},
			&core.TextField{Name: "planId"},
			&core.NumberField{Name: "planWeek"},
			&core.NumberField{Name: "nutritionCycle"},
			&core.TextField{Name: "date"},
			&core.TextField{Name: "mealId"},
		)

		applyUserRules(nutritionFoodRecords)

		if err := app.Save(nutritionFoodRecords); err != nil {
			return err
		}

		// ============================================================
		// EXTRA FOOD RECORDS
		// ============================================================

		extraFoodRecords := core.NewBaseCollection("extraFoodRecords")

		extraFoodRecords.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				CollectionId:  users.Id,
				CascadeDelete: true,
				MaxSelect:     1,
			},
			&core.TextField{
				Name:     "recordId",
				Required: true,
			},
			&core.TextField{Name: "dailyRecordId"},
			&core.TextField{Name: "description"},
			&core.TextField{Name: "time"},
		)

		applyUserRules(extraFoodRecords)

		if err := app.Save(extraFoodRecords); err != nil {
			return err
		}

		// ============================================================
		// WEEKLY PROGRESS RECORDS
		// ============================================================

		weeklyProgressRecords := core.NewBaseCollection("weeklyProgressRecords")

		weeklyProgressRecords.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				CollectionId:  users.Id,
				CascadeDelete: true,
				MaxSelect:     1,
			},
			&core.TextField{
				Name:     "recordId",
				Required: true,
			},
			&core.TextField{Name: "date"},
			&core.NumberField{Name: "weight"},
			&core.NumberField{Name: "chest"},
			&core.NumberField{Name: "waist"},
			&core.NumberField{Name: "hips"},
			&core.NumberField{Name: "arms"},
			&core.NumberField{Name: "legs"},
		)

		applyUserRules(weeklyProgressRecords)

		if err := app.Save(weeklyProgressRecords); err != nil {
			return err
		}

		// ============================================================
		// WORKOUT NUTRITION NOTES
		// ============================================================

		workoutNutritionNotes := core.NewBaseCollection("workoutNutritionNotes")

		workoutNutritionNotes.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				CollectionId:  users.Id,
				CascadeDelete: true,
				MaxSelect:     1,
			},
			&core.TextField{
				Name:     "recordId",
				Required: true,
			},
			&core.TextField{Name: "date"},
			&core.TextField{Name: "note"},
		)

		applyUserRules(workoutNutritionNotes)

		if err := app.Save(workoutNutritionNotes); err != nil {
			return err
		}

		return nil
	}, func(app core.App) error {
		// Rollback in reverse dependency order.
		names := []string{
			"workoutNutritionNotes",
			"weeklyProgressRecords",
			"extraFoodRecords",
			"nutritionFoodRecords",
			"nutritionDailyRecords",
			"workoutSetRecords",
			"workoutDailyRecords",
			"workoutPlanVersions",
			"workoutPlans",
			"settings",
			"dayRecords",
			"habits",
		}

		for _, name := range names {
			collection, err := app.FindCollectionByNameOrId(name)
			if err != nil {
				continue
			}

			if err := app.Delete(collection); err != nil {
				return err
			}
		}

		return nil
	})
}

func applyUserRules(collection *core.Collection) {
	collection.ListRule = types.Pointer(userRule)
	collection.ViewRule = types.Pointer(userRule)
	collection.CreateRule = types.Pointer(userRule)
	collection.UpdateRule = types.Pointer(userRule)
	collection.DeleteRule = types.Pointer(userRule)
}
